import { MetadataRoute } from 'next';
import { initializeFirebaseServer } from '@/firebase/server-init';
import { collection, getDocs } from 'firebase/firestore';
import type { Test } from '@/lib/types';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { firestore } = initializeFirebaseServer();
  const baseUrl = 'https://tnpsc99.com';

  // Static Pages
  const staticRoutes = [
    '/', '/dashboard', '/login', '/signup', '/profile', '/class-wise',
    '/online-tests', '/exam-history', '/performance', '/leaderboard',
    '/bookmarks', '/feedback', '/admin', '/about-us', '/privacy-policy',
    '/terms-and-conditions', '/refund-policy', '/contact',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly' as const,
    priority: route === '/' ? 1 : 0.8,
  }));

  const uniqueRoutes = new Set<string>();

  // Dynamic Pages from Tests with a 3-second timeout to prevent build-time hangs
  try {
    const testsCollection = collection(firestore, 'tests');
    const testsSnapshot = await Promise.race([
      getDocs(testsCollection),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Sitemap fetch timeout')), 3000))
    ]);
    
    testsSnapshot.docs.forEach(doc => {
      const test = doc.data() as Test;
      
      // Add test page
      uniqueRoutes.add(`${baseUrl}/test/${test.id}`);

      // Add class page
      if (test.classId) {
        uniqueRoutes.add(`${baseUrl}/class/${test.classId}?bookType=${test.bookType || 'samacheer'}`);
      }

      // Add subject page for a class
      if (test.classId && test.subjectId) {
         uniqueRoutes.add(`${baseUrl}/class/${test.classId}/subject/${test.subjectId}?bookType=${test.bookType || 'samacheer'}`);
      }
      
      // Add category page for a subject
       if (test.classId && test.subjectId && test.categoryId) {
         uniqueRoutes.add(`${baseUrl}/class/${test.classId}/subject/${test.subjectId}?category=${test.categoryId}&bookType=${test.bookType || 'samachee'}`);
      }
    });
  } catch (error) {
    console.error("Could not fetch dynamic routes for sitemap:", error);
  }


  const dynamicRoutes = Array.from(uniqueRoutes).map(url => ({
    url,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...dynamicRoutes];
}
