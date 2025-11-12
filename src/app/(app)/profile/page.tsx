'use client';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { collection, query, where } from 'firebase/firestore';
import type { UserTestAttempt } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const testAttemptsCollection = useMemoFirebase(() => 
    user ? collection(firestore, `users/${user.uid}/testAttempts`) : null, 
    [user, firestore]
  );

  const { data: testAttempts, isLoading: attemptsLoading } = useCollection<UserTestAttempt>(testAttemptsCollection);

  if (isUserLoading || attemptsLoading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (!user) {
    return <div className="container mx-auto p-4">Please log in to view your profile.</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="flex flex-col sm:flex-row items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? ''} />
            <AvatarFallback className="text-3xl">
              {user.displayName
                ? user.displayName.charAt(0)
                : user.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="text-center sm:text-left">
            <CardTitle className="text-3xl">{user.displayName || user.email}</CardTitle>
            <CardDescription className="mt-2">{user.email}</CardDescription>
             <CardDescription>பயனர் {new Date(user.metadata.creationTime!).toLocaleDateString()}-அன்று சேர்ந்தார்</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <h2 className="text-2xl font-semibold mt-8 mb-4">தேர்வு முயற்சிகள்</h2>
          {testAttempts && testAttempts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>தேர்வு</TableHead>
                  <TableHead>தேதி</TableHead>
                  <TableHead className="text-right">மதிப்பெண்</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testAttempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="font-medium">{attempt.testTitle ?? 'Unknown Test'}</TableCell>
                    <TableCell>{format(new Date(attempt.attemptDate), 'PPp')}</TableCell>
                    <TableCell className="text-right">{attempt.score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">நீங்கள் இன்னும் எந்த தேர்வையும் எடுக்கவில்லை.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
