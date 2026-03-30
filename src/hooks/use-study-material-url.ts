'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import type { StudyMaterial, Test } from '@/lib/types';
import { useMemo } from 'react';

export function useStudyMaterialUrl(test: Test) {
  const firestore = useFirestore();

  // Search for materials matching the test's basic parameters
  const materialsQuery = useMemoFirebase(() => {
    if (!firestore || !test.classId || !test.subjectId) return null;

    let q = query(
      collection(firestore, 'studyMaterials'),
      where('classId', '==', test.classId),
      where('subjectId', '==', test.subjectId)
    );

    // Further narrow down if specific metadata is available
    if (test.medium) {
        q = query(q, where('medium', '==', test.medium));
    }
    if (test.bookType) {
        q = query(q, where('bookType', '==', test.bookType));
    }
    // Note: term matching might be tricky due to different phrasing, but let's try
    if (test.term) {
        q = query(q, where('term', '==', test.term));
    }

    return query(q, limit(1));
  }, [firestore, test.classId, test.subjectId, test.medium, test.bookType, test.term]);

  const { data: materials, isLoading } = useCollection<StudyMaterial>(materialsQuery);

  const matchedMaterial = useMemo(() => {
    if (!materials || materials.length === 0) return null;
    return materials[0];
  }, [materials]);

  return {
    downloadURL: matchedMaterial?.downloadURL || null,
    isLoading
  };
}
