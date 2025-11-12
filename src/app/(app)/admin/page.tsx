'use client';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, getFirestore } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { UserProfile, UserTestAttempt } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

function AllUserAttempts() {
    const firestore = useFirestore();
    const [allAttempts, setAllAttempts] = useState<UserTestAttempt[]>([]);
    const [loading, setLoading] = useState(true);

    const usersCollection = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
    const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersCollection);

    useEffect(() => {
        if (!users) return;

        const fetchAttempts = async () => {
            setLoading(true);
            const attemptsPromises = users.map(async (user) => {
                const attemptsRef = collection(firestore, `users/${user.id}/testAttempts`);
                const { data: attempts } = await new Promise<any>(resolve => {
                    const { data, isLoading } = useCollection(attemptsRef);
                    if(!isLoading) resolve({data, isLoading});
                });
                return attempts ? attempts.map(att => ({ ...att, userEmail: user.email })) : [];
            });
            const attemptsArrays = await Promise.all(attemptsPromises);
            const flattenedAttempts = attemptsArrays.flat();
            setAllAttempts(flattenedAttempts);
            setLoading(false);
        };
        // This is a simplified approach. In a real app with many users,
        // you would paginate this data or use a collection group query.
        const fetchAllAttempts = async () => {
            setLoading(true);
            if (!users) {
              setLoading(false);
              return;
            }
        
            const allUserAttempts: UserTestAttempt[] = [];
        
            for (const user of users) {
              const attemptsRef = collection(firestore, 'users', user.id, 'testAttempts');
              // This is not a hook call, but a one-time fetch
              const { getDocs } = await import('firebase/firestore');
              const attemptsSnapshot = await getDocs(attemptsRef);
              attemptsSnapshot.forEach((doc) => {
                allUserAttempts.push({ 
                  id: doc.id,
                  ...doc.data(),
                  userEmail: user.email
                } as UserTestAttempt);
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
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      if (!user || !userProfile?.isAdmin) {
        router.push('/');
      }
    }
  }, [user, isUserLoading, userProfile, isProfileLoading, router]);

  if (isUserLoading || isProfileLoading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (!userProfile?.isAdmin) {
    return <div className="container mx-auto p-4">You are not authorized to view this page.</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <h1 className="text-3xl font-bold mb-6">நிர்வாக குழு</h1>
      <AllUserAttempts />
    </div>
  );
}
