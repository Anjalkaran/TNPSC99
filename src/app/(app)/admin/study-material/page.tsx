'use client';
import { useState, useMemo, ChangeEvent } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  doc,
  addDoc,
  serverTimestamp,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { Trash, FileText, UploadCloud } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import type { StudyMaterial, Class, Subject } from '@/lib/types';
import { format } from 'date-fns';

const studyMaterialSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  description: z.string().optional(),
  classId: z.string().min(1, 'Please select a class.'),
  subjectId: z.string().min(1, 'Please select a subject.'),
  file: z.any().refine((files) => files?.length === 1, 'A file is required.'),
});

type FormValues = z.infer<typeof studyMaterialSchema>;

function ExistingMaterialsList() {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { toast } = useToast();

  const materialsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'studymaterials') : null, [firestore]);
  const materialsQuery = useMemoFirebase(() => materialsCollection ? query(materialsCollection, orderBy('createdAt', 'desc')) : null, [materialsCollection]);
  
  const { data: materials, isLoading } = useCollection<StudyMaterial>(materialsQuery);
  const { data: classes } = useCollection<Class>(useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]));
  const { data: subjects } = useCollection<Subject>(useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]));

  const materialsWithNames = useMemo(() => {
    if (!materials || !classes || !subjects) return [];
    const classMap = new Map(classes.map(c => [c.id, c.name_ta || c.name]));
    const subjectMap = new Map(subjects.map(s => [s.id, s.name_ta || s.name]));
    return materials.map(material => ({
      ...material,
      className: classMap.get(material.classId) || 'Unknown Class',
      subjectName: subjectMap.get(material.subjectId) || 'Unknown Subject',
    }));
  }, [materials, classes, subjects]);

  const handleDelete = async (material: StudyMaterial) => {
    if (!firestore) return;
    const storage = getStorage();
    const materialDocRef = doc(firestore, 'studymaterials', material.id);
    const fileRef = ref(storage, material.fileUrl);

    try {
      // Delete Firestore document
      await deleteDoc(materialDocRef);
      // Delete file from Storage
      await deleteObject(fileRef);

      toast({ title: t('material_deleted') });
    } catch (error: any) {
      console.error("Error deleting material: ", error);
      toast({
        variant: 'destructive',
        title: t('error_deleting_material'),
        description: error.code === 'storage/object-not-found'
          ? "File was not found in storage, but database entry was deleted."
          : error.message,
      });
    }
  };

  if (isLoading) return <p>{t('loading_users')}</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('existing_study_materials')}</CardTitle>
      </CardHeader>
      <CardContent>
        {materialsWithNames.length > 0 ? (
          <ul className="space-y-3">
            {materialsWithNames.map(material => (
              <li key={material.id} className="flex justify-between items-center p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">{material.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {material.className} - {material.subjectName} | {format(new Date(material.createdAt), 'PP')}
                    </p>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('confirm_deletion_title')}</AlertDialogTitle>
                      <AlertDialogDescription>{t('delete_material_confirm', { title: material.title })}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(material)}>{t('delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t('no_study_materials')}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function StudyMaterialAdminPage() {
  const { t, language } = useTranslation();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const classesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
  const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesCollection);
  
  const subjectsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]);
  const { data: subjects, isLoading: subjectsLoading } = useCollection<Subject>(subjectsCollection);

  const form = useForm<FormValues>({
    resolver: zodResolver(studyMaterialSchema),
    defaultValues: {
      title: '',
      description: '',
      classId: '',
      subjectId: '',
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!firestore) return;
    setIsSubmitting(true);
    setUploadProgress(0);

    const file = data.file[0] as File;
    const storage = getStorage();
    const storagePath = `study-materials/${data.classId}/${data.subjectId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        toast({ variant: 'destructive', title: t('upload_error'), description: error.message });
        setIsSubmitting(false);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          const materialData: Omit<StudyMaterial, 'id'> = {
            title: data.title,
            description: data.description || '',
            classId: data.classId,
            subjectId: data.subjectId,
            fileUrl: downloadURL,
            fileName: file.name,
            createdAt: new Date().toISOString(),
          };

          await addDoc(collection(firestore, 'studymaterials'), materialData);
          
          toast({ title: t('upload_success') });
          form.reset();
        } catch (error: any) {
          toast({ variant: 'destructive', title: t('upload_error'), description: 'Failed to save material data to database.' });
        } finally {
          setIsSubmitting(false);
          setUploadProgress(0);
        }
      }
    );
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t('study_material')}</h1>
        <p className="text-muted-foreground">{t('upload_study_material_desc')}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>{t('upload_study_material')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('title')}</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., History Notes Chapter 1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('subject_description')}</FormLabel>
                      <FormControl>
                        <Textarea placeholder="A brief summary of the PDF content" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('class_name')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={classesLoading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('select_a_class')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes?.map(c => <SelectItem key={c.id} value={c.id}>{language === 'ta' && c.name_ta ? c.name_ta : c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('subject_name')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={subjectsLoading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('Select a subject...')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subjects?.map(s => <SelectItem key={s.id} value={s.id}>{language === 'ta' && s.name_ta ? s.name_ta : s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="file"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('file')}</FormLabel>
                      <FormControl>
                        <Input type="file" accept="application/pdf" {...form.register('file')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isSubmitting && <Progress value={uploadProgress} className="w-full" />}
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  <UploadCloud className="mr-2 h-4 w-4" />
                  {isSubmitting ? `${t('uploading')} (${uploadProgress.toFixed(0)}%)` : t('upload')}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        <div className="md:col-span-2">
          <ExistingMaterialsList />
        </div>
      </div>
    </div>
  );
}
