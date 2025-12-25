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

  useEffect(() => {
    // Wait until loading is completely finished
    if (isUserLoading || isProfileLoading) {
      return; // Still loading, so do nothing.
    }

    // After loading, if there's no user or the profile isn't an admin, redirect.
    if (!user || !userProfile?.isAdmin) {
      router.replace('/');
    }
  }, [user, userProfile, isUserLoading, isProfileLoading, router]);


  // Show a loading screen while we verify the user
  if (isUserLoading || isProfileLoading) {
    return <div className="container mx-auto p-4">Verifying access...</div>;
  }

  // If we're done loading and the profile is an admin, render the page.
  // This check prevents a flicker of the admin content for non-admin users before redirection.
  if (userProfile?.isAdmin) {
    return (
      <div className="container mx-auto p-4 sm:p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">நிர்வாக குழு</h1>
              <Button asChild>
                  <Link href="/admin/upload">
                      <Upload className="mr-2 h-4 w-4" />
                      MCQ களைப் பதிவேற்றவும்
                  </Link>
              </Button>
          </div>
        <AllUserAttempts />
      </div>
    );
  }
  
  // If the user is not an admin after loading, they are about to be redirected.
  // We can show a simple message or null.
  return <div className="container mx-auto p-4">Redirecting...</div>;
}
