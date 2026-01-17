'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebaseApp, useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash } from 'lucide-react';
import type { ReferenceMaterial, Class, Subject } from '@/lib/types';

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  description: z.string().optional(),
  classId: z.string().min(1, 'Please select a class.'),
  subjectId: z.string().min(1, 'Please select a subject.'),
  file: z.instanceof(FileList).refine(files => files.length > 0, 'A file is required.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function ReferenceMaterialAdminPage() {
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const { user } = useUser();
  const { toast } = useToast();

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', description: '', classId: '', subjectId: '' },
  });
  
  const fileRef = form.register("file");

  const classesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
  const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesCollection);
  
  const subjectsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]);
  const { data: subjects, isLoading: subjectsLoading } = useCollection<Subject>(subjectsCollection);

  const materialsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'referencematerials') : null, [firestore]);
  const materialsQuery = useMemoFirebase(() => materialsCollection ? query(materialsCollection, orderBy('createdAt', 'desc')) : null, [materialsCollection]);
  const { data: materials, isLoading: materialsLoading } = useCollection<ReferenceMaterial>(materialsQuery);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to upload files.' });
      return;
    }
    console.log("AUTH USER:", user);

    const file = data.file[0];
    if (!file) return;

    setIsSubmitting(true);
    setUploadProgress(0);

    const storage = getStorage(firebaseApp);
    const storagePath = `reference-materials/${data.classId}/${data.subjectId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    
    const uploadTask = uploadBytesResumable(storageRef, file, { contentType: file.type });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        console.log(
          "STATE:",
          snapshot.state,
          snapshot.bytesTransferred,
          snapshot.totalBytes
        );
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("🔥 STORAGE ERROR:", error);
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: error.code,
        });
        setIsSubmitting(false);
        setUploadProgress(null);
      },
      async () => {
        console.log("✅ Upload complete");
        try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            if (!firestore) throw new Error("Firestore not initialized");
            
            await addDoc(collection(firestore, 'referencematerials'), {
              title: data.title,
              description: data.description ?? '',
              classId: data.classId,
              subjectId: data.subjectId,
              fileUrl: downloadURL,
              storagePath: storagePath,
              fileName: file.name,
              createdAt: serverTimestamp(),
            });

            toast({ title: 'Upload Successful', description: `${file.name} has been uploaded.` });
            form.reset();
        } catch (dbError: any) {
            console.error("Database write failed:", dbError);
            toast({ variant: 'destructive', title: 'Database Save Failed', description: 'File uploaded, but failed to save reference to database. ' + dbError.message });
            
            // Attempt to delete the orphaned file from storage
            try {
                await deleteObject(storageRef);
            } catch (cleanupError: any) {
                console.error("Orphaned file cleanup failed:", cleanupError);
                toast({ variant: 'destructive', title: 'Cleanup Failed', description: 'Could not delete orphaned file from storage. Please do so manually.'});
            }
        } finally {
            // This will run whether the try or catch block executed
            setIsSubmitting(false);
            setUploadProgress(null);
        }
      }
    );
  };

  const handleDelete = async (material: ReferenceMaterial) => {
    if (!firestore) return;
    const storage = getStorage(firebaseApp);
    const materialDocRef = doc(firestore, 'referencematerials', material.id);
    const fileRef = ref(storage, material.storagePath);

    try {
        await deleteObject(fileRef);
        await deleteDoc(materialDocRef);
        toast({ title: 'Material Deleted', description: `${material.fileName} has been deleted.` });
    } catch (error: any) {
        console.error("Deletion failed:", error);
        toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
    }
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Upload Reference Material</CardTitle>
          <CardDescription>Upload a new PDF document for a specific class and subject.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input placeholder="e.g., 10th Science Book" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="A short description of the material" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="classId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Class</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={classesLoading}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name_ta || c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="subjectId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={subjectsLoading}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a subject" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjects?.map(s => <SelectItem key={s.id} value={s.id}>{s.name_ta || s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormItem>
                <FormLabel>File</FormLabel>
                <FormControl><Input type="file" accept=".pdf" {...fileRef} /></FormControl>
                <FormMessage />
              </FormItem>

              {uploadProgress !== null && <Progress value={uploadProgress} />}

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Uploading...' : 'Upload Material'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Existing Reference Materials</CardTitle>
            <CardDescription>View and manage uploaded materials.</CardDescription>
        </CardHeader>
        <CardContent>
            {materialsLoading ? <p>Loading materials...</p> : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>File Name</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {materials?.map(material => (
                            <TableRow key={material.id}>
                                <TableCell className="font-medium">{material.title}</TableCell>
                                <TableCell>{material.fileName}</TableCell>
                                <TableCell className="text-right">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="icon"><Trash className="h-4 w-4" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete the file "{material.fileName}". This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(material)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
