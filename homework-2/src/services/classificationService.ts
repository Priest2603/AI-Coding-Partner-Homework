import { ClassificationResult, ClassificationInput } from '../types/classification';
import { Category, Priority } from '../types/ticket';
import logger from './logger';

// Keyword weights for different priority levels
const WEIGHTS = {
  URGENT: 2.0,
  HIGH: 1.5,
  CATEGORY: 1.0,
  LOW: 0.8
};

// Category keyword mappings (from TASKS.md)
const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  account_access: ['login', 'password', '2fa', 'two-factor', 'authentication', 'sign in', 'access denied'],
  technical_issue: ['bug', 'error', 'crash', 'broken', 'not working', 'fails', 'failure'],
  billing_question: ['payment', 'invoice', 'refund', 'charge', 'subscription', 'billing', 'price'],
  feature_request: ['enhancement', 'suggestion', 'improve', 'add feature', 'would like', 'request'],
  bug_report: ['defect', 'reproduction', 'steps to reproduce', 'reproduce', 'consistently'],
  other: []
};

// Priority keyword mappings with weights (from TASKS.md)
const PRIORITY_KEYWORDS: Record<Priority, { keywords: string[]; weight: number }> = {
  urgent: {
    keywords: ["can't access", 'critical', 'production down', 'security', 'urgent', 'immediately', 'asap now'],
    weight: WEIGHTS.URGENT
  },
  high: {
    keywords: ['important', 'blocking', 'asap', 'high priority', 'needed soon'],
    weight: WEIGHTS.HIGH
  },
  medium: {
    keywords: [],
    weight: WEIGHTS.CATEGORY
  },
  low: {
    keywords: ['minor', 'cosmetic', 'suggestion', 'nice to have', 'eventually'],
    weight: WEIGHTS.LOW
  }
};

/**
 * Classification Service
 * Implements weighted keyword-based classification for support tickets
 */
class ClassificationService {
  /**
   * Classify a ticket based on subject and description
   * Uses weighted keyword matching with "most weight wins" conflict resolution
   */
  classify(input: ClassificationInput): ClassificationResult {
    const text = `${input.subject} ${input.description}`.toLowerCase();
    
    // Find matching category with highest weight
    const categoryResult = this.classifyCategory(text);
    
    // Find matching priority with highest weight
    const priorityResult = this.classifyPriority(text);
    
    // Calculate overall confidence score
    const totalWeight = categoryResult.weight + priorityResult.weight;
    const maxPossibleWeight = WEIGHTS.CATEGORY + WEIGHTS.URGENT;
    const confidence = Math.min(totalWeight / maxPossibleWeight, 1.0);
    
    // Build reasoning string
    const allKeywords = [...categoryResult.keywords, ...priorityResult.keywords];
    const reasoning = allKeywords.length > 0
      ? `Detected keywords: ${allKeywords.map(k => `'${k}'`).join(', ')}`
      : 'No specific keywords detected, using defaults';
    
    const result: ClassificationResult = {
      category: categoryResult.category,
      priority: priorityResult.priority,
      confidence: Number(confidence.toFixed(2)),
      reasoning,
      keywords_found: allKeywords
    };
    
    // Log classification decision
    logger.info('Ticket classified', {
      category: result.category,
      priority: result.priority,
      confidence: result.confidence,
      keywords_count: allKeywords.length
    });
    
    return result;
  }
  
  /**
   * Classify category based on keyword matching
   * Returns category with most matched keywords (most weight wins)
   */
  private classifyCategory(text: string): { category: Category; weight: number; keywords: string[] } {
    let bestCategory: Category = 'other';
    let maxWeight = 0;
    let matchedKeywords: string[] = [];
    
    // Check each category's keywords
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (category === 'other') continue;
      
      const matches = keywords.filter(keyword => text.includes(keyword.toLowerCase()));
      const weight = matches.length * WEIGHTS.CATEGORY;
      
      if (weight > maxWeight) {
        maxWeight = weight;
        bestCategory = category as Category;
        matchedKeywords = matches;
      }
    }
    
    return {
      category: bestCategory,
      weight: maxWeight,
      keywords: matchedKeywords
    };
  }
  
  /**
   * Classify priority based on weighted keyword matching
   * Returns priority with highest total weight
   */
  private classifyPriority(text: string): { priority: Priority; weight: number; keywords: string[] } {
    let bestPriority: Priority = 'medium';
    let maxWeight = 0;
    let matchedKeywords: string[] = [];
    
    // Check each priority level's keywords
    for (const [priority, config] of Object.entries(PRIORITY_KEYWORDS)) {
      if (config.keywords.length === 0) continue;
      
      const matches = config.keywords.filter(keyword => text.includes(keyword.toLowerCase()));
      const weight = matches.length * config.weight;
      
      if (weight > maxWeight) {
        maxWeight = weight;
        bestPriority = priority as Priority;
        matchedKeywords = matches;
      }
    }
    
    return {
      priority: bestPriority,
      weight: maxWeight,
      keywords: matchedKeywords
    };
  }
}

// Export singleton instance
export const classificationService = new ClassificationService();
