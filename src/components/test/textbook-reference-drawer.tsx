'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TextbookReferenceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url?: string;
  printedPage?: number;
  offset?: number;
  title?: string;
  citation?: string;
  isAuthorized: boolean;
}

export function TextbookReferenceDrawer({
  open,
  onOpenChange,
  url,
  printedPage = 1,
  offset = 0,
  title = 'Textbook Reference',
  citation,
  isAuthorized,
}: TextbookReferenceDrawerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(printedPage + offset);

  // Reconcile physical page from printed page and offset
  const computedPdfPage = printedPage + (offset || 0);

  useEffect(() => {
    setCurrentPage(computedPdfPage);
  }, [computedPdfPage]);

  // Load PDF document when URL and drawer are active
  useEffect(() => {
    if (!open || !url || !isAuthorized) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadPdf = async () => {
      try {
        // @ts-ignore
        const lib = window.pdfjsLib || window['pdfjsLib'];
        if (!lib) {
          // If PDF.js isn't loaded globally yet, load from CDN or fallback
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
          script.onload = () => {
            // @ts-ignore
            const loadedLib = window.pdfjsLib;
            if (loadedLib) {
              loadedLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
              fetchDoc(loadedLib);
            }
          };
          script.onerror = () => {
            if (isMounted) setError('Could not load PDF engine. Please open the reference externally.');
            setLoading(false);
          };
          document.head.appendChild(script);
        } else {
          lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
          fetchDoc(lib);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Error loading PDF:', err);
          setError(err.message || 'Failed to initialize PDF viewer.');
          setLoading(false);
        }
      }
    };

    const fetchDoc = async (lib: any) => {
      try {
        const loadingTask = lib.getDocument({ url, withCredentials: false });
        const doc = await loadingTask.promise;
        if (isMounted) {
          setPdfDoc(doc);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('PDF fetch error:', err);
          setError('Unable to fetch textbook PDF stream. You can view via the link below.');
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [open, url, isAuthorized]);

  // Render current page onto canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !open) return;

    let renderTask: any = null;

    const render = async () => {
      try {
        const pageToRender = Math.max(1, Math.min(currentPage, pdfDoc.numPages));
        const page = await pdfDoc.getPage(pageToRender);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('Canvas render error:', err);
        }
      }
    };

    render();

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage, scale, open]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (pdfDoc && currentPage < pdfDoc.numPages) setCurrentPage(currentPage + 1);
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 2.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.6));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-2xl md:max-w-3xl p-0 flex flex-col bg-card border-l border-border shadow-2xl z-50"
      >
        {/* Header Bar */}
        <SheetHeader className="p-4 sm:p-5 border-b border-border bg-muted/40">
          <div className="flex items-center justify-between gap-2 pr-8">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-foreground">
                  {title}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Samacheer Kalvi Textbook Reference Passages
                </SheetDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-xs font-semibold bg-background">
                Printed Page: <strong className="ml-1 text-primary">{printedPage}</strong>
              </Badge>
              <Badge variant="secondary" className="text-xs font-semibold">
                PDF Page: <strong className="ml-1 text-foreground">{currentPage}</strong>
              </Badge>
            </div>
          </div>

          {citation && (
            <div className="mt-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground/90 font-medium">
              <span className="font-bold text-primary mr-1">Supporting Citation:</span>
              <span>{citation}</span>
            </div>
          )}
        </SheetHeader>

        {/* Toolbar Controls */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b border-border text-xs">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || loading}
              className="h-8 px-2.5 rounded-lg"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
            </Button>
            <span className="px-2 font-mono font-bold text-foreground">
              {currentPage} {pdfDoc ? `/ ${pdfDoc.numPages}` : ''}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!pdfDoc || currentPage >= pdfDoc.numPages || loading}
              className="h-8 px-2.5 rounded-lg"
            >
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              className="h-8 w-8 rounded-lg"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-[11px] font-mono text-muted-foreground w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              className="h-8 w-8 rounded-lg"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            {url && (
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="h-8 w-8 rounded-lg ml-1"
                title="Open in new window"
              >
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Viewer Area */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-900/5 dark:bg-slate-950/40">
          {!isAuthorized ? (
            <div className="text-center p-8 max-w-sm space-y-3">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
              <h4 className="font-bold text-sm text-foreground">Subscription Required</h4>
              <p className="text-xs text-muted-foreground">
                Textbook page reference citations require an active ₹99/month MCQ Academy subscription.
              </p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-medium text-muted-foreground">Loading textbook page {computedPdfPage}...</p>
            </div>
          ) : error ? (
            <div className="text-center p-8 max-w-sm space-y-3">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground leading-relaxed">{error}</p>
              {url && (
                <Button asChild size="sm" variant="outline" className="rounded-xl">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    Open Document Link <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <div className="shadow-xl rounded-lg overflow-hidden border border-border bg-white inline-block">
              <canvas ref={canvasRef} className="max-w-full h-auto block" />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
