'use client';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, query, orderBy, limit, startAfter, getDocs, getCountFromServer, where, DocumentSnapshot } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';
import { History, BarChart2, Trash, UserPlus, Edit, Users, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useState, useMemo, useEffect, useCallback } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


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

const PAGE_SIZE = 50;

export default function UserManagementPage() {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);

    // State for Users List Pagination
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastVisibleDocs, setLastVisibleDocs] = useState<DocumentSnapshot[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [hasNextPage, setHasNextPage] = useState(true);

    // State for Global Stats
    const [counts, setCounts] = useState({ total: 0, online: 0 });
    const [onlineUsersList, setOnlineUsersList] = useState<UserProfile[]>([]);
    const [statsLoading, setStatsLoading] = useState(true);

    const isSubscriptionActive = (user: UserProfile) => {
        if (user.isAdmin) return true;
        if (user.subscriptionStatus !== 'premium') return false;
        if (!user.subscriptionExpires) return false;
        
        try {
            const expiryDate = new Date(user.subscriptionExpires);
            if (isNaN(expiryDate.getTime())) return false;
            return expiryDate.getTime() > Date.now();
        } catch (e) {
            return false;
        }
    };

    const fetchStats = useCallback(async () => {
        if (!firestore) return;
        setStatsLoading(true);
        try {
            const usersRef = collection(firestore, 'users');
            // Fetch total users using getCountFromServer (cheap and fast)
            const totalSnap = await getCountFromServer(usersRef);
            
            // Fetch online users (active in last 5 mins)
            const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const onlineQuery = query(usersRef, where('lastSeen', '>', fiveMinsAgo), limit(100));
            // Note: we just fetch up to 100 recent online users to show in the dropdown, 
            // and use the snapshot size for the count.
            const onlineSnap = await getDocs(onlineQuery);
            
            setCounts({
                total: totalSnap.data().count,
                online: onlineSnap.size
            });

            const onlineList: UserProfile[] = [];
            onlineSnap.forEach(doc => {
                onlineList.push({ ...doc.data(), id: doc.id } as UserProfile);
            });
            setOnlineUsersList(onlineList);
        } catch (error) {
            console.error("Failed to fetch user stats", error);
        } finally {
            setStatsLoading(false);
        }
    }, [firestore]);

    const fetchUsersPage = useCallback(async (pageIndex: number, resetFirst = false) => {
        if (!firestore) return;
        setIsLoading(true);
        try {
            const usersRef = collection(firestore, 'users');
            let q = query(usersRef, orderBy('registrationDate', 'desc'), limit(PAGE_SIZE));

            if (pageIndex > 0 && lastVisibleDocs[pageIndex - 1]) {
                q = query(q, startAfter(lastVisibleDocs[pageIndex - 1]));
            }

            const snapshot = await getDocs(q);
            
            const fetchedUsers: UserProfile[] = [];
            snapshot.forEach(doc => {
                fetchedUsers.push({ ...doc.data(), id: doc.id } as UserProfile);
            });

            setUsers(fetchedUsers);
            setHasNextPage(snapshot.docs.length === PAGE_SIZE);

            if (snapshot.docs.length > 0) {
                 const newLastDocs = [...lastVisibleDocs];
                 newLastDocs[pageIndex] = snapshot.docs[snapshot.docs.length - 1];
                 setLastVisibleDocs(newLastDocs);
            }
            setCurrentPage(pageIndex);
        } catch (error: any) {
            console.error("Failed to fetch users", error);
            if (error?.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: `users`,
                    operation: 'list',
                });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                toast({
                    variant: 'destructive',
                    title: "Fetch Failed",
                    description: "Could not load users list. Please try again.",
                });
            }
        } finally {
            setIsLoading(false);
        }
    }, [firestore, lastVisibleDocs]);

    // Initial Load
    useEffect(() => {
        if (firestore) {
            fetchStats();
            fetchUsersPage(0);
        }
    }, [firestore]);

    const handleNextPage = () => {
        if (hasNextPage) fetchUsersPage(currentPage + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 0) fetchUsersPage(currentPage - 1);
    };

    const handleRefresh = () => {
        fetchStats();
        fetchUsersPage(0, true);
    };

    const handleDeleteUser = async (userId: string, username: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'users', userId));
            toast({
                title: "User Data Deleted",
                description: `Profile data for '${username}' has been removed. Note: Their authentication account still exists.`,
            });
            fetchUsersPage(currentPage); // Refresh current page
            fetchStats();
        } catch (error: any) {
             console.error('Error deleting user profile:', error);
            if (error?.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: `users/${userId}`,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
            }
            toast({
                variant: 'destructive',
                title: "Deletion Failed",
                description: error?.message || "You may not have permission to delete user profiles.",
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
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading || statsLoading}>
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
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
                            <AddUserForm onFinished={() => { setIsAddUserOpen(false); handleRefresh(); }} />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Dialog>
                <DialogTrigger asChild>
                    <Card className={`bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20 shadow-sm transition-all group ${statsLoading ? 'opacity-50' : 'cursor-pointer hover:border-green-500/40'}`}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-green-600 uppercase flex justify-between">
                                Online Users
                                <Users className="h-4 w-4 group-hover:scale-110 transition-transform" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{statsLoading ? '-' : counts.online}</div>
                            <p className="text-xs text-muted-foreground mt-1">Active in last 5 mins (Click to view)</p>
                        </CardContent>
                    </Card>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            Currently Online Users ({counts.online})
                        </DialogTitle>
                        <DialogDescription>
                            Users who have been active within the last 5 minutes.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] mt-4 pr-4">
                        <div className="space-y-4">
                            {onlineUsersList.length > 0 ? (
                                onlineUsersList.map((u) => (
                                    <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                        <Avatar className="h-10 w-10 border border-green-100">
                                            <AvatarFallback className="bg-green-50 text-green-700 font-bold">
                                                {(u.username || u.email || '?').charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-semibold text-sm truncate">{u.username || 'Unknown User'}</span>
                                            <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                                        </div>
                                        {u.isAdmin && (
                                            <Badge className="ml-auto text-[10px] scale-90" variant="outline">Admin</Badge>
                                        )}
                                        {isSubscriptionActive(u) && !u.isAdmin && (
                                            <Badge className="ml-auto text-[10px] scale-90 bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">Premium</Badge>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-muted-foreground text-sm py-8"> No users currently online.</p>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
                <Card className={`bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20 shadow-sm ${statsLoading ? 'opacity-50' : ''}`}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-500 uppercase flex justify-between">
                            Total Accounts
                            <BarChart2 className="h-4 w-4" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{statsLoading ? '-' : counts.total}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total registered users</p>
                    </CardContent>
                </Card>
                <Card className="bg-muted border-muted shadow-sm opacity-60">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex justify-between">
                            Subscription Stats
                            <Badge variant="outline" className="text-muted-foreground">Info</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-medium">N/A</div>
                        <p className="text-xs text-muted-foreground mt-1">Aggregated stats disabled for scale.</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center text-base">
                        <span>{t('users')} (Page {currentPage + 1})</span>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={currentPage === 0 || isLoading}
                                onClick={handlePrevPage}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={!hasNextPage || isLoading}
                                onClick={handleNextPage}
                            >
                                Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                     {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : users.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">#</TableHead>
                                    <TableHead>{t('username')}</TableHead>
                                    <TableHead>{t('email')}</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Subscription</TableHead>
                                    <TableHead className="text-right">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user, index) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium text-muted-foreground">
                                            {(currentPage * PAGE_SIZE) + index + 1}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {user.username || 'Unknown User'}
                                                {user.lastSeen && (Date.now() - new Date(user.lastSeen).getTime() < 5 * 60 * 1000) && (
                                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Online" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{user.isAdmin ? <Badge>Admin</Badge> : 'User'}</TableCell>
                                        <TableCell>
                                            {user.isAdmin ? (
                                                <Badge>Admin Access</Badge>
                                            ) : isSubscriptionActive(user) ? (
                                                <div className="flex flex-col">
                                                <Badge>Premium</Badge>
                                                {user.subscriptionExpires && (
                                                    <span className="text-xs text-muted-foreground">
                                                    Expires: {format(new Date(user.subscriptionExpires), 'dd-MM-yyyy')}
                                                    </span>
                                                )}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    <Badge variant="secondary">Free</Badge>
                                                    {user.subscriptionStatus === 'premium' && user.subscriptionExpires && (
                                                        <span className="text-[10px] text-destructive font-medium uppercase">
                                                            Expired {format(new Date(user.subscriptionExpires), 'dd-MM-yyyy')}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <TooltipProvider>
                                                <div className="flex flex-wrap justify-end items-center gap-1">
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
                        <p className="text-muted-foreground text-center py-8">{t('no_users_found')}</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
