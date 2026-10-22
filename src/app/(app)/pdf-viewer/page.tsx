'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Loader2, ZoomIn, ZoomOut, Download, AlertCircle, Plus, Minus, Hash } from 'lucide-react';
import { useEffect, useRef, useState, Suspense, useCallback } from 'react';
import Script from 'next/script';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { hasActiveSubscription } from '@/lib/subscription-utils';

function PdfViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const url = searchParams.get('url');

  const userProfileRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (!isUserLoading && !profileLoading && userProfile) {
      if (!userProfile.isAdmin && !hasActiveSubscription(userProfile)) {
        router.replace('/subscription');
      }
    }
  }, [isUserLoading, profileLoading, userProfile, router]);

  if (isUserLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  const pageNumber = parseInt(searchParams.get('page') || '1', 10);
  const initialOffset = parseInt(searchParams.get('offset') || '0', 10);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(0.9);
  const [offset, setOffset] = useState(initialOffset);
  const [isPdfjsLoaded, setIsPdfjsLoaded] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<string>('Initializing...');

  const physicalPage = pageNumber + offset;

  const initializePdfjs = useCallback((lib: any) => {
    if (isPdfjsLoaded) return;
    try {
        lib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`; // Use local worker
        setIsPdfjsLoaded(true);
        setDebugInfo('PDF.js initialized.');
    } catch (err: any) {
        console.error('Error in initializePdfjs:', err);
        setDebugInfo(`Init error: ${err.message}`);
    }
  }, [isPdfjsLoaded]);

  const handleScriptLoad = useCallback(() => {
    // @ts-ignore
    const lib = window.pdfjsLib || window['pdfjsLib'] || window['pdfjs-dist/build/pdf'];
    if (lib) {
        initializePdfjs(lib);
    }
  }, [initializePdfjs]);

  useEffect(() => {
    const interval = setInterval(() => {
      // @ts-ignore
      const lib = window.pdfjsLib || window['pdfjsLib'] || window['pdfjs-dist/build/pdf'];
      if (lib && !isPdfjsLoaded) {
        initializePdfjs(lib);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isPdfjsLoaded, initializePdfjs]);

  const renderPage = useCallback(async (pdf: any, num: number, currentScale: number) => {
    if (!canvasRef.current || num < 1 || num > pdf.numPages) return;
    
    setDebugInfo(`Rendering physical page ${num}...`);
    try {
      const page = await pdf.getPage(num);
      const viewport = page.getViewport({ scale: currentScale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      await page.render(renderContext).promise;
      
      setDebugInfo('Page rendered.');
      setLoading(false);
    } catch (err: any) {
      console.error('Error rendering page:', err);
      setDebugInfo(`Render error: ${err.message}`);
      if (!error) setError(`Failed to render page: ${err.message}`);
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    if (!url || !isPdfjsLoaded) return;

    const loadPdf = async () => {
      setLoading(true);
      setError(null);
      setDebugInfo(`Loading PDF...`);
      try {
        // @ts-ignore
        const lib = window.pdfjsLib;
        if (!lib) throw new Error("PDF library missing");

        const loadingTask = lib.getDocument({
          url: url,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/cmaps/',
          cMapPacked: true,
          disableAutoFetch: true,
          disableStream: true,
          rangeChunkSize: 65536,
        });

        // Add progress monitoring
        loadingTask.onProgress = (progress: { loaded: number; total: number }) => {
            if (progress.total > 0) {
                const percent = Math.round((progress.loaded / progress.total) * 100);
                setDebugInfo(`Downloading: ${percent}%`);
            } else {
                setDebugInfo(`Loading: ${Math.round(progress.loaded / 1024)}KB...`);
            }
        };

        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        
        const targetPage = pageNumber + offset;
        if (targetPage > pdf.numPages || targetPage < 1) {
            setDebugInfo(`Page ${targetPage} out of range. Showing page 1.`);
            await renderPage(pdf, 1, scale);
        } else {
            await renderPage(pdf, targetPage, scale);
        }
      } catch (err: any) {
        console.error('Error loading PDF:', err);
        setError(`Failed to load PDF: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadPdf();
  }, [url, isPdfjsLoaded, pageNumber, offset, scale, renderPage]);

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">No PDF URL provided</h1>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-muted/30">
        <Script 
            src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js" 
            onLoad={handleScriptLoad}
            crossOrigin="anonymous"
            strategy="afterInteractive"
        />
        
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between p-4 border-b bg-card shadow-sm gap-4">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="font-semibold text-lg leading-none">Reference Material</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="px-2 py-0 h-5 text-[10px] uppercase font-bold">
                            Doc Page {pageNumber}
                        </Badge>
                        <span className="text-muted-foreground text-xs">→</span>
                        <Badge variant="outline" className="px-2 py-0 h-5 text-[10px] uppercase font-bold bg-primary/5">
                            Physical Page {physicalPage}
                        </Badge>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                {/* Offset Controls */}
                <div className="flex items-center bg-muted rounded-md p-1 gap-1">
                    <span className="text-[10px] font-bold uppercase px-2 text-muted-foreground">Offset</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOffset(o => o - 1)} disabled={loading}>
                        <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-xs font-mono font-bold w-6 text-center">{offset > 0 ? `+${offset}` : offset}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOffset(o => o + 1)} disabled={loading}>
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>

                <div className="flex items-center bg-muted rounded-md p-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.max(0.5, s - 0.2))} disabled={loading}>
                        <ZoomOut className="h-3 w-3" />
                    </Button>
                    <span className="text-xs font-medium w-12 text-center">{Math.round(scale * 100)}%</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.min(3, s + 0.2))} disabled={loading}>
                        <ZoomIn className="h-3 w-3" />
                    </Button>
                </div>

                <div className="hidden md:flex items-center gap-2">
                    <Button variant="outline" asChild size="sm">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2 h-4 w-4" />
                            Download
                        </a>
                    </Button>
                    <Button variant="outline" asChild size="sm">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open Original
                        </a>
                    </Button>
                </div>
            </div>
        </div>

        <div className="flex-grow overflow-auto p-4 md:p-8 flex flex-col items-center">
            {error && (
                <Alert variant="destructive" className="max-w-2xl mb-8">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        {error}
                        <div className="mt-4 flex gap-4">
                            <Button variant="outline" size="sm" asChild>
                                <a href={url} target="_blank" rel="noopener noreferrer">Open Original PDF</a>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                                Retry
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            <div className="relative bg-white shadow-2xl rounded-sm overflow-hidden min-h-[400px] min-w-[300px] mb-8 transition-all duration-300">
                {(loading && !error) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-20 p-6 text-center">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
                        <p className="text-sm font-medium">{debugInfo}</p>
                        <p className="text-[10px] text-muted-foreground mt-4 max-w-xs">
                            Trying to load only page {physicalPage}. Large files may still take a moment to initialize.
                        </p>
                        
                        {/* Fallback option for very slow loads */}
                        <div className="mt-8 pt-8 border-t w-full">
                            <p className="text-xs mb-3 text-muted-foreground">Still loading? Try the alternative viewer:</p>
                            <Button variant="outline" size="sm" asChild>
                                <a 
                                    href={`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center"
                                >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Open in Fast Viewer
                                </a>
                            </Button>
                        </div>
                    </div>
                )}
                <canvas ref={canvasRef} className="max-w-full h-auto" />
            </div>
            
            {(loading || error) && (
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-4">
                    Status: {debugInfo}
                </p>
            )}
        </div>
    </div>
  );
}

export default function PdfViewerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading Viewer...</div>}>
      <PdfViewerContent />
    </Suspense>
  );
}
