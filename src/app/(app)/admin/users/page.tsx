'use client';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';
import { History, BarChart2, Trash, UserPlus, Edit } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';


const addUserSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters.'),
    email: z.string().email('Invalid email address.'),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    isAdmin: z.boolean().default(false),
});

type AddUserFormValues = z.infer<typeof addUserSchema>;

function AddUserForm({ onFinished }: { onFinished: () => void }) {
    const { t } = useTranslation();
    const auth = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<AddUserFormValues>({
        resolver: zodResolver(addUserSchema),
        defaultValues: {
            username: '',
            email: '',
            password: '',
            isAdmin: false,
        },
    });

    const onSubmit = async (values: AddUserFormValues) => {
        setIsSubmitting(true);
        try {
            // Note: This creates a user in the client. In a real-world scenario with stricter controls,
            // this would be handled by a backend function to prevent unauthorized user creation.
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            const newUser = userCredential.user;

            await updateProfile(newUser, { displayName: values.username });
            
            const userProfile: UserProfile = {
                id: newUser.uid,
                username: values.username,
                email: values.email,
                registrationDate: new Date().toISOString(),
                isAdmin: values.isAdmin,
                referralCode: newUser.uid.slice(0, 8),
                referralCount: 0,
                subscriptionStatus: 'free',
            };

            const userDocRef = doc(firestore, 'users', newUser.uid);
            await setDoc(userDocRef, userProfile);

            toast({
                title: "User Created",
                description: `User "${values.username}" has been successfully created.`,
            });
            onFinished();
        } catch (error: any) {
            console.error("Error creating user:", error);
            toast({
                variant: 'destructive',
                title: "Error Creating User",
                description: error.message || "An unexpected error occurred.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('username')}</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('email')}</FormLabel>
                        <FormControl>
                            <Input placeholder="user@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">{t('cancel')}</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Creating User..." : "Create User"}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}


export default function UserManagementPage() {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);

    const usersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const { data: users, isLoading } = useCollection<UserProfile>(usersCollection);

    const handleDeleteUser = async (userId: string, username: string) => {
        if (!firestore) return;
        
        try {
            await deleteDoc(doc(firestore, 'users', userId));
            toast({
                title: "User Data Deleted",
                description: `Profile data for '${username}' has been removed. Note: Their authentication account still exists.`,
            });
        } catch (error: any) {
             console.error('Error deleting user profile:', error);
            const permissionError = new FirestorePermissionError({
                path: `users/${userId}`,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({
                variant: 'destructive',
                title: "Deletion Failed",
                description: "You may not have permission to delete user profiles.",
            });
        }
    };


    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
             <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">{t('user_management')}</h1>
                    <p className="text-muted-foreground">{t('all_users_desc')}</p>
                </div>
                <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add User
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New User</DialogTitle>
                            <DialogDescription>Create a new user account and profile.</DialogDescription>
                        </DialogHeader>
                        <AddUserForm onFinished={() => setIsAddUserOpen(false)} />
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {t('users')}
                        {users && <span className="text-sm font-normal text-muted-foreground">({users.length})</span>}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                     {isLoading ? (
                        <p>{t('loading_users')}...</p>
                    ) : users && users.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('username')}</TableHead>
                                    <TableHead>{t('email')}</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Subscription</TableHead>
                                    <TableHead className="text-right">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell>{user.username}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{user.isAdmin ? <Badge>Admin</Badge> : 'User'}</TableCell>
                                        <TableCell>
                                            {user.isAdmin ? (
                                                <Badge>Admin Access</Badge>
                                            ) : user.subscriptionStatus === 'premium' ? (
                                                <div className="flex flex-col">
                                                <Badge>Premium</Badge>
                                                {user.subscriptionExpires && (
                                                    <span className="text-xs text-muted-foreground">
                                                    Expires: {format(new Date(user.subscriptionExpires), 'P')}
                                                    </span>
                                                )}
                                                </div>
                                            ) : (
                                                <Badge variant="secondary">Free</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <TooltipProvider>
                                                <div className="flex justify-end items-center gap-2">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button asChild variant="ghost" size="icon">
                                                                <Link href={`/admin/users/${encodeURIComponent(user.id)}/edit`}>
                                                                    <Edit className="h-4 w-4" />
                                                                </Link>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>Edit User</p></TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button asChild variant="ghost" size="icon">
                                                                <Link href={`/admin/users/${encodeURIComponent(user.id)}/history`}>
                                                                    <History className="h-4 w-4" />
                                                                </Link>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>View History</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button asChild variant="ghost" size="icon">
                                                                <Link href={`/admin/users/${encodeURIComponent(user.id)}/performance`}>
                                                                    <BarChart2 className="h-4 w-4" />
                                                                </Link>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>View Performance</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                    <AlertDialog>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                                        <Trash className="h-4 w-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Delete User</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete user data for '{user.username}'?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This will delete the user's profile from Firestore but will NOT delete their authentication account. The user will still be able to log in. This action is irreversible.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteUser(user.id, user.username)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                            Confirm Deletion
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TooltipProvider>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-muted-foreground text-center">{t('no_users_found')}</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
