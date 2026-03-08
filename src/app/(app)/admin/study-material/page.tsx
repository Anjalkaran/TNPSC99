
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useFirebaseApp } from '@/firebase';
import { getStorage, ref, getDownloadURL, deleteObject, uploadBytes } from 'firebase/storage';
import {
  collection,
  doc,
  deleteDoc,
  query,
  addDoc,
} from 'firebase/firestore';
import { useForm, type SubmitHandler } from 'react-hook-form';
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
import { useToast } from '@/hooks/use-toast';
import type { StudyMaterial, Class, Subject } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trash, BookOpen, Download } from 'lucide-react';
import Link from 'next/link';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


const uploadSchema = z.object({
  classId: z.string().min(1, 'Please select a class.'),
  subjectId: z.string().min(1, 'Please select a subject.'),
  term: z.string().min(1, 'Please select a term.'),
  medium: z.enum(['tamil', 'english'], { required_error: 'Please select a medium.' }),
  bookType: z.enum(['samacheer', 'old'], { required_error: 'Please select a book type.' }),
  file: z.instanceof(File).refine(file => file.size > 0, 'Please select a file to upload.'),
});
type UploadValues = z.infer<typeof uploadSchema>;

function ExistingMaterialsList() {
    const firestore = useFirestore();
    const storage = getStorage(useFirebaseApp());
    const { toast } = useToast();
  
    const materialsQuery = useMemoFirebase(() => query(collection(firestore, 'studyMaterials')), [firestore]);
    const { data: materials, isLoading } = useCollection<StudyMaterial>(materialsQuery);
  
    const handleDelete = async (material: StudyMaterial) => {
      try {
        // Delete Firestore document
        await deleteDoc(doc(firestore, 'studyMaterials', material.id));
  
        // Delete file from Storage
        const fileRef = ref(storage, material.storagePath);
        await deleteObject(fileRef);
  
        toast({ title: 'Success', description: 'Study material deleted successfully.' });
      } catch (error: any) {
        console.error('Error deleting material:', error);
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      }
    };
  
    return (
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Study Materials</CardTitle>
          <CardDescription>View and manage existing study materials.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading materials...</p>
          ) : !materials || materials.length === 0 ? (
            <p className="text-center text-muted-foreground p-8">No study materials uploaded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">{material.fileName}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{`${material.term} | ${material.medium} | ${material.bookType}`}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button asChild variant="outline" size="icon">
                        <Link href={material.downloadURL} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon">
                            <Trash className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the file and its record. This action cannot be undone.
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
    );
  }

export default function StudyMaterialAdminPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const storage = getStorage(firebaseApp, "gs://tnpsc99.appspot.com");
  const { toast } = useToast();

  const classesQuery = useMemoFirebase(() => collection(firestore, 'classes'), [firestore]);
  const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesQuery);

  const subjectsQuery = useMemoFirebase(() => collection(firestore, 'subjects'), [firestore]);
  const { data: subjects, isLoading: subjectsLoading } = useCollection<Subject>(subjectsQuery);

  const form = useForm<UploadValues>({
    resolver: zodResolver(uploadSchema),
  });

  const onSubmit: SubmitHandler<UploadValues> = async (values) => {
    setIsUploading(true);
    setUploadProgress(0);

    const { classId, subjectId, term, medium, bookType, file } = values;
    if (!file) {
        toast({ variant: 'destructive', title: 'File not found', description: 'Please select a file to upload.' });
        setIsUploading(false);
        return;
    }
    
    // TEMPORARY: Use a timestamp-based simple path for testing
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const storagePath = `testing/${timestamp}_${cleanFileName}`;
    const storageRef = ref(storage, storagePath);

    try {
      console.log("Starting upload for:", file.name, "Size:", file.size);
      
      const snapshot = await uploadBytes(storageRef, file);
      console.log("Upload finished!");
      
      const downloadURL = await getDownloadURL(snapshot.ref);

      const newMaterial: Omit<StudyMaterial, 'id'> = {
        classId,
        subjectId,
        term,
        medium,
        bookType,
        fileName: cleanFileName,
        downloadURL,
        storagePath,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(firestore, 'studyMaterials'), newMaterial);
      toast({ title: 'Upload Successful', description: `${cleanFileName} has been uploaded.` });
      form.reset();

    } catch (error: any) {
        console.error("DETAILED ERROR:", error);
        toast({ 
            variant: 'destructive', 
            title: 'Upload Failed', 
            description: `Code: ${error.code} - ${error.message}` 
        });
    } finally {
        setIsUploading(false);
        setUploadProgress(0);
    }
  };
  
  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Study Material Management</h1>
        <p className="text-muted-foreground">Upload and manage school books and reference PDFs.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Upload New Book</CardTitle>
            <CardDescription>Select a PDF and provide its details to upload.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="classId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={classesLoading}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select a Class" /></SelectTrigger></FormControl>
                          <SelectContent>{classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name_ta || c.name}</SelectItem>)}</SelectContent>
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
                        <FormLabel>Subject</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={subjectsLoading}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select a Subject" /></SelectTrigger></FormControl>
                          <SelectContent>{subjects?.map(s => <SelectItem key={s.id} value={s.id}>{s.name_ta || s.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="term"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Term</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a Term" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="பருவம் 1">பருவம் 1</SelectItem>
                          <SelectItem value="பருவம் 2">பருவம் 2</SelectItem>
                          <SelectItem value="பருவம் 3">பருவம் 3</SelectItem>
                          <SelectItem value="Full Book">Full Book</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="medium"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medium</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4 pt-2">
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl><RadioGroupItem value="tamil" /></FormControl>
                              <FormLabel className="font-normal">தமிழ்</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl><RadioGroupItem value="english" /></FormControl>
                              <FormLabel className="font-normal">English</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bookType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Book Type</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4 pt-2">
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl><RadioGroupItem value="samacheer" /></FormControl>
                              <FormLabel className="font-normal">Samacheer</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl><RadioGroupItem value="old" /></FormControl>
                              <FormLabel className="font-normal">Old</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="file"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>PDF File</FormLabel>
                      <FormControl>
                        <Input
                          {...fieldProps}
                          type="file"
                          accept="application/pdf"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) onChange(file);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isUploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} />
                    <p className="text-sm text-muted-foreground text-center">{uploadProgress.toFixed(0)}%</p>
                  </div>
                )}
                <Button type="submit" disabled={isUploading} className="w-full">
                  <BookOpen className="mr-2 h-4 w-4" />
                  {isUploading ? 'Uploading...' : 'Upload Book'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <ExistingMaterialsList />
        </div>
      </div>
    </div>
  );
}
