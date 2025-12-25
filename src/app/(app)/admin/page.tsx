'use client';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { UserProfile, UserTestAttempt } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Upload } from 'lucide-react';

function AllUsersList() {
    const firestore = useFirestore();
    const usersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersCollection);

    if (usersLoading) return <p>Loading users...</p>

    return (
        <Card>
            <CardHeader>
                <CardTitle>அனைத்து பயனர்கள்</CardTitle>
                <CardDescription>பயன்பாட்டில் பதிவுசெய்யப்பட்ட அனைத்து பயனர்களின் பட்டியல்.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>பயனர்பெயர்</TableHead>
                            <TableHead>மின்னஞ்சல்</TableHead>
                            <TableHead>பதிவு செய்த தேதி</TableHead>
                            <TableHead>நிர்வாகி?</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users?.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.username}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{format(new Date(user.registrationDate), 'PP')}</TableCell>
                                <TableCell>{user.isAdmin ? 'ஆம்' : 'இல்லை'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                 {users?.length === 0 && <p className="text-center text-muted-foreground p-8">No users found.</p>}
            </CardContent>
        </Card>
    )
}

function AllUserAttempts() {
    const firestore = useFirestore();
    const [allAttempts, setAllAttempts] = useState<(UserTestAttempt & { userEmail?: string })[]>([]);
    const [loading, setLoading] = useState(true);

    const usersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersCollection);

    useEffect(() => {
        const fetchAllAttempts = async () => {
            if (!firestore || !users) {
              setLoading(false);
              return;
            }
        
            setLoading(true);
            const allUserAttempts: (UserTestAttempt & { userEmail?: string })[] = [];
        
            for (const user of users) {
              const attemptsRef = collection(firestore, 'users', user.id, 'testAttempts');
              const attemptsSnapshot = await getDocs(attemptsRef);
              attemptsSnapshot.forEach((doc) => {
                allUserAttempts.push({ 
                  id: doc.id,
                  ...(doc.data() as UserTestAttempt),
                  userEmail: user.email
                });
              });
            }
        
            setAllAttempts(allUserAttempts.sort((a,b) => new Date(b.attemptDate).getTime() - new Date(a.attemptDate).getTime()));
            setLoading(false);
          };
      
          fetchAllAttempts();
    }, [users, firestore]);

    if(loading || usersLoading) return <p>Loading all user attempts...</p>
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>அனைத்து பயனர் முயற்சிகள்</CardTitle>
                <CardDescription>பயன்பாட்டில் உள்ள அனைத்து பயனர்களின் சமீபத்திய சோதனை முயற்சிகள்.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>பயனர்</TableHead>
                            <TableHead>தேர்வு</TableHead>
                            <TableHead>தேதி</TableHead>
                            <TableHead className="text-right">மதிப்பெண்</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {allAttempts.map((attempt) => (
                            <TableRow key={attempt.id}>
                                <TableCell>{attempt.userEmail}</TableCell>
                                <TableCell className="font-medium">{attempt.testTitle ?? 'Unknown Test'}</TableCell>
                                <TableCell>{format(new Date(attempt.attemptDate), 'PPp')}</TableCell>
                                <TableCell className="text-right">{attempt.score}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                 {allAttempts.length === 0 && <p className="text-center text-muted-foreground p-8">No attempts found.</p>}
            </CardContent>
        </Card>
    )

}

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const isDataReady = !isUserLoading && !isProfileLoading;

  useEffect(() => {
    // Only perform redirection logic once all data is ready.
    if (isDataReady) {
      // If, after loading, there's no user or the user is not an admin, redirect.
      if (!user || !userProfile?.isAdmin) {
        router.replace('/');
      }
    }
  }, [isDataReady, user, userProfile, router]);
  
  // While any data is loading, show a clear loading message and prevent any other rendering.
  if (!isDataReady) {
    return <div className="container mx-auto p-4">அணுகலைச் சரிபார்க்கிறது...</div>;
  }
  
  // Only render the admin content if the user is authenticated AND a confirmed admin.
  if (user && userProfile?.isAdmin) {
    return (
      <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-8">
          <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">நிர்வாக குழு</h1>
              <Button asChild>
                  <Link href="/admin/upload">
                      <Upload className="mr-2 h-4 w-4" />
                      MCQ களைப் பதிவேற்றவும்
                  </Link>
              </Button>
          </div>
        <AllUsersList />
        <AllUserAttempts />
      </div>
    );
  }
  
  // If the logic falls through (e.g., user is not admin after loading),
  // this will show a message just before the useEffect redirects.
  return <div className="container mx-auto p-4">அனுமதியற்றது. திருப்பி விடப்படுகிறது...</div>;
}
