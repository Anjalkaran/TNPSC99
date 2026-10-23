/**
 * Privacy-Conscious Public Learning Analytics
 * Measures anonymous visitor engagement and subscription conversion funnel
 * without collecting any Personally Identifiable Information (PII).
 */

export type PublicAnalyticsEvent = 
  | 'homepage_impression'
  | 'free_test_start'
  | 'free_test_complete'
  | 'ai_tutor_demo_view'
  | 'signup_cta_click'
  | 'checkout_start'
  | 'subscription_success';

export interface AnalyticsEventPayload {
  testType?: 'current_affairs' | 'mock_test' | 'textbook';
  topicId?: string;
  source?: string;
  score?: number;
  total?: number;
  medium?: 'tamil' | 'english';
  timestamp?: string;
}

const STORAGE_KEY = 'tnpsc99_public_analytics_events';

export const PublicAnalytics = {
  /**
   * Tracks an anonymous engagement event in privacy-conscious local aggregate storage.
   */
  track(event: PublicAnalyticsEvent, payload?: AnalyticsEventPayload) {
    if (typeof window === 'undefined') return;

    // Check if user has Do Not Track enabled
    if (navigator.doNotTrack === '1' || (window as any).doNotTrack === '1') {
      return;
    }

    try {
      const existingRaw = localStorage.getItem(STORAGE_KEY);
      const events: { event: PublicAnalyticsEvent; payload?: AnalyticsEventPayload; timestamp: string }[] = 
        existingRaw ? JSON.parse(existingRaw) : [];

      // Append event with timestamp
      events.push({
        event,
        payload,
        timestamp: new Date().toISOString(),
      });

      // Maintain rolling cap of 100 recent anonymous aggregate events
      if (events.length > 100) {
        events.shift();
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));

      // Dispatch custom window event for optional listeners
      window.dispatchEvent(new CustomEvent('tnpsc99_analytics_event', { detail: { event, payload } }));
    } catch {
      // Graceful fallback if localStorage is disabled or restricted
    }
  },

  trackHomepageImpression() {
    this.track('homepage_impression');
  },

  trackFreeTestStart(testType: 'current_affairs' | 'mock_test' | 'textbook', medium: 'tamil' | 'english') {
    this.track('free_test_start', { testType, medium });
  },

  trackFreeTestComplete(testType: 'current_affairs' | 'mock_test' | 'textbook', score: number, total: number, medium: 'tamil' | 'english') {
    this.track('free_test_complete', { testType, score, total, medium });
  },

  trackAiTutorDemoView(topicId: string) {
    this.track('ai_tutor_demo_view', { topicId });
  },

  trackSignupCtaClick(source: string) {
    this.track('signup_cta_click', { source });
  },

  trackCheckoutStart(source: string) {
    this.track('checkout_start', { source });
  },

  trackSubscriptionSuccess(source: string) {
    this.track('subscription_success', { source });
  },

  getRecentEvents() {
    if (typeof window === 'undefined') return [];
    try {
      const existingRaw = localStorage.getItem(STORAGE_KEY);
      return existingRaw ? JSON.parse(existingRaw) : [];
    } catch {
      return [];
    }
  },
};
