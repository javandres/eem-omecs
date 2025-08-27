import { KoboToolBoxSubmission } from './koboToolBox';

export type ScoringRuleType = 'select' | 'multiple_max' | 'value';

export type Section = 'area_conservacion' | 'gestion' | 'caracteristicas_area';

export interface ScoringRule {
  column: string;
  name: string;
  section: string;
  eem: string;
  genero: string;
  potencial_omec: string;
  value: string;
  score: number;
  type: ScoringRuleType;
}

// New interface for grouped multiple_max rules
export interface GroupedMultipleMaxRule {
  baseColumn: string;
  rules: ScoringRule[];
  maxPossibleScore: number;
  questionName: string;
  section: string;
  eem: string;
  genero: string;
  potencial_omec: string;
}

export interface ScoringResult {
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  categoryScores: CategoryScore[];
  detailedResults: DetailedResult[];
}

export interface CategoryScore {
  category: string;
  categoryType: 'eem' | 'genero' | 'potencial_omec';
  score: number;
  maxScore: number;
  percentage: number;
  questionCount: number;
}

export interface DetailedResult {
  column: string;
  question: string;
  section: string;
  eem: string;
  genero: string;
  omecPotential: string;
  expectedValue: string;
  actualValue: string;
  score: number;
  maxScore: number;
  type: string;
  // Add detailed multiple max information
  multipleMaxDetails?: Array<{
    optionName: string;
    displayName: string;
    isSelected: boolean;
    score: number;
    column: string;
  }>;
}

class ScoringService {
  private scoringRules: ScoringRule[] = [];
  private groupedMultipleMaxRules: Map<string, GroupedMultipleMaxRule> = new Map();

  async loadScoringRules(): Promise<void> {
    try {
      // Try to determine if we're on the client or server side
      let apiUrl = '/api/csv-data';
      
      // If we're on the client side, try to use the full URL
      if (typeof window !== 'undefined') {
        const baseUrl = window.location.origin;
        apiUrl = `${baseUrl}/api/csv-data`;
      }
      
      console.log('Loading scoring rules from:', apiUrl);
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Failed to load scoring rules: ${response.status} ${response.statusText}`);
      }
      const rules = await response.json();
      
      await this.processScoringRules(rules);
    } catch (error) {
      console.error('Error loading scoring rules:', error);
      throw error;
    }
  }

  async loadScoringRulesFromData(rules: Record<string, unknown>[]): Promise<void> {
    try {
      console.log('Loading scoring rules from provided data:', rules.length, 'rules');
      await this.processScoringRules(rules);
    } catch (error) {
      console.error('Error loading scoring rules from data:', error);
      throw error;
    }
  }

  private async processScoringRules(rules: Record<string, unknown>[]): Promise<void> {
    // Filter and validate rules
    const validRules = rules.filter((rule: Record<string, unknown>) => 
      rule.column && 
      rule.score !== undefined && 
      rule.score !== '' &&
      rule.type
    ) as unknown as ScoringRule[];
    
    // Convert score to number if it's a string
    this.scoringRules = validRules.map(rule => ({
      ...rule,
      score: typeof rule.score === 'string' ? parseFloat(rule.score) : rule.score
    }));
    
    // Group multiple_max rules by base column name
    this.groupMultipleMaxRules();
    
    // Check for potential duplicate rules
    const columnCounts = new Map<string, number>();
    for (const rule of this.scoringRules) {
      columnCounts.set(rule.column, (columnCounts.get(rule.column) || 0) + 1);
    }
    
    const duplicates = Array.from(columnCounts.entries()).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.warn('Warning: Found columns with multiple rules:', duplicates);
    }
    
    console.log(`Loaded ${this.scoringRules.length} scoring rules`);
    console.log(`Grouped ${this.groupedMultipleMaxRules.size} multiple_max question groups`);
    console.log('Rules summary:', this.getScoringRulesSummary());
  }

  private groupMultipleMaxRules(): void {
    this.groupedMultipleMaxRules.clear();
    
    // Find all multiple_max rules
    const multipleMaxRules = this.scoringRules.filter(rule => rule.type === 'multiple_max');
    
    // Group by base column name (remove the /option part)
    for (const rule of multipleMaxRules) {
      const baseColumn = rule.column.split('/')[0];
      
      if (!this.groupedMultipleMaxRules.has(baseColumn)) {
        this.groupedMultipleMaxRules.set(baseColumn, {
          baseColumn,
          rules: [],
          maxPossibleScore: 0,
          questionName: rule.name.split('/')[0], // Get base question name
          section: rule.section,
          eem: rule.eem,
          genero: rule.genero,
          potencial_omec: rule.potencial_omec
        });
      }
      
      const group = this.groupedMultipleMaxRules.get(baseColumn)!;
      group.rules.push(rule);
      
      // Calculate max possible score (sum of all positive scores)
      if (rule.score > 0) {
        group.maxPossibleScore += rule.score;
      }
    }
    
    console.log('Multiple max rules grouped:', Array.from(this.groupedMultipleMaxRules.entries()));
  }

  /**
   * Calculate the total maximum possible score from all available scoring rules
   * This ensures that maxPossibleScore is constant regardless of submission responses
   */
  private calculateTotalMaxPossibleScore(): number {
    let totalMax = 0;
    
    // Add scores from multiple_max rules (already grouped)
    for (const group of this.groupedMultipleMaxRules.values()) {
      totalMax += group.maxPossibleScore;
    }
    
    // Add scores from other rule types
    for (const rule of this.scoringRules) {
      if (rule.type !== 'multiple_max') {
        totalMax += rule.score;
      }
    }
    
    console.log(`Calculated total max possible score: ${totalMax} from ${this.scoringRules.length} rules`);
    return totalMax;
  }

  /**
   * Calculate the maximum possible score for each category based on ALL available rules
   * This ensures category max scores are constant regardless of submission responses
   */
  private calculateCategoryMaxScores(): {
    eem: Map<string, number>;
    genero: Map<string, number>;
    omecPotential: Map<string, number>;
  } {
    const eemMaxScores = new Map<string, number>();
    const generoMaxScores = new Map<string, number>();
    const omecPotentialMaxScores = new Map<string, number>();

    console.log('=== DEBUGGING calculateCategoryMaxScores ===');
    console.log('Total scoring rules:', this.scoringRules.length);
    console.log('Multiple max groups:', this.groupedMultipleMaxRules.size);

    // Process multiple_max rules by group (not by individual rule to avoid duplication)
    const processedGroups = new Set<string>();
    for (const [baseColumn, group] of this.groupedMultipleMaxRules) {
      if (processedGroups.has(baseColumn)) continue;
      processedGroups.add(baseColumn);
      
      console.log(`Processing multiple_max group: ${baseColumn}`);
      console.log(`  - EEM: ${group.eem}`);
      console.log(`  - Género: ${group.genero}`);
      console.log(`  - Potencial OMEC: ${group.potencial_omec}`);
      console.log(`  - Max possible score: ${group.maxPossibleScore}`);
      
      // Add to EEM category if applicable
      if (group.eem && group.eem.trim() !== '' && group.eem !== 'N/A') {
        const currentScore = eemMaxScores.get(group.eem) || 0;
        eemMaxScores.set(group.eem, currentScore + group.maxPossibleScore);
        console.log(`  -> Added ${group.maxPossibleScore} to EEM category "${group.eem}" (total: ${currentScore + group.maxPossibleScore})`);
      }
      // Add to Género category if applicable
      if (group.genero && group.genero.trim() !== '' && group.genero !== 'N/A') {
        const currentScore = generoMaxScores.get(group.genero) || 0;
        generoMaxScores.set(group.genero, currentScore + group.maxPossibleScore);
        console.log(`  -> Added ${group.maxPossibleScore} to Género category "${group.genero}" (total: ${currentScore + group.maxPossibleScore})`);
      }
      // Add to Potencial OMEC category if applicable
      if (group.potencial_omec && group.potencial_omec.trim() !== '' && group.potencial_omec !== 'N/A') {
        const currentScore = omecPotentialMaxScores.get(group.potencial_omec) || 0;
        omecPotentialMaxScores.set(group.potencial_omec, currentScore + group.maxPossibleScore);
        console.log(`  -> Added ${group.maxPossibleScore} to Potencial OMEC category "${group.potencial_omec}" (total: ${currentScore + group.maxPossibleScore})`);
      }
    }

    // Group rules by column and category to find max scores
    console.log('\nProcessing non-multiple_max rules by column:');
    
    // Group rules by column and category
    const columnGroups = new Map<string, {
      eem: Map<string, number>;
      genero: Map<string, number>;
      omecPotential: Map<string, number>;
    }>();

    for (const rule of this.scoringRules) {
      if (rule.type !== 'multiple_max') {
        if (!columnGroups.has(rule.column)) {
          columnGroups.set(rule.column, {
            eem: new Map<string, number>(),
            genero: new Map<string, number>(),
            omecPotential: new Map<string, number>()
          });
        }

        const columnGroup = columnGroups.get(rule.column)!;

        // Group by EEM category
        if (rule.eem && rule.eem.trim() !== '' && rule.eem !== 'N/A') {
          const currentMax = columnGroup.eem.get(rule.eem) || 0;
          columnGroup.eem.set(rule.eem, Math.max(currentMax, rule.score));
        }

        // Group by Género category
        if (rule.genero && rule.genero.trim() !== '' && rule.genero !== 'N/A') {
          const currentMax = columnGroup.genero.get(rule.genero) || 0;
          columnGroup.genero.set(rule.genero, Math.max(currentMax, rule.score));
        }

        // Group by Potencial OMEC category
        if (rule.potencial_omec && rule.potencial_omec.trim() !== '' && rule.potencial_omec !== 'N/A') {
          const currentMax = columnGroup.omecPotential.get(rule.potencial_omec) || 0;
          columnGroup.omecPotential.set(rule.potencial_omec, Math.max(currentMax, rule.score));
        }
      }
    }

    // Now process the grouped rules to add max scores to categories
    for (const [column, columnGroup] of columnGroups) {
      console.log(`\nColumn ${column}:`);
      
      // Process EEM scores
      for (const [eemCategory, maxScore] of columnGroup.eem) {
        const currentScore = eemMaxScores.get(eemCategory) || 0;
        eemMaxScores.set(eemCategory, currentScore + maxScore);
        console.log(`  -> Added ${maxScore} to EEM category "${eemCategory}" for column ${column} (total: ${currentScore + maxScore})`);
      }

      // Process Género scores
      for (const [generoCategory, maxScore] of columnGroup.genero) {
        const currentScore = generoMaxScores.get(generoCategory) || 0;
        generoMaxScores.set(generoCategory, currentScore + maxScore);
        console.log(`  -> Added ${maxScore} to Género category "${generoCategory}" for column ${column} (total: ${currentScore + maxScore})`);
      }

      // Process Potencial OMEC scores
      for (const [omecCategory, maxScore] of columnGroup.omecPotential) {
        const currentScore = omecPotentialMaxScores.get(omecCategory) || 0;
        omecPotentialMaxScores.set(omecCategory, currentScore + maxScore);
        console.log(`  -> Added ${maxScore} to Potencial OMEC category "${omecCategory}" for column ${column} (total: ${currentScore + maxScore})`);
      }
    }

    console.log('\n=== FINAL CATEGORY MAX SCORES ===');
    console.log('EEM:', Object.fromEntries(eemMaxScores));
    console.log('Género:', Object.fromEntries(generoMaxScores));
    console.log('Potencial OMEC:', Object.fromEntries(omecPotentialMaxScores));
    console.log('=== END DEBUGGING ===\n');

    return { eem: eemMaxScores, genero: generoMaxScores, omecPotential: omecPotentialMaxScores };
  }

  async evaluateSubmission(submission: KoboToolBoxSubmission): Promise<ScoringResult> {
    if (this.scoringRules.length === 0) {
      await this.loadScoringRules();
    }

    const detailedResults: DetailedResult[] = [];
    let totalScore = 0;
    
    // Calculate maxPossibleScore from ALL available rules (not just answered questions)
    const maxPossibleScore = this.calculateTotalMaxPossibleScore();
    console.log(`Total max possible score from all rules: ${maxPossibleScore}`);

    // Get all unique columns from submission that have values
    const submissionColumns = this.getSubmissionColumns(submission);
    console.log(`Evaluating submission with ${submissionColumns.length} columns:`, submissionColumns);
    
    // Process multiple_max questions first
    const processedMultipleMaxColumns = new Set<string>();
    for (const [baseColumn, group] of this.groupedMultipleMaxRules) {
      const score = this.calculateMultipleMaxScore(group, submission);
      const actualValues = this.extractMultipleMaxValues(submission, baseColumn);
      const detailedInfo = this.getDetailedMultipleMaxInfo(submission, baseColumn);
      
      // Determine EEM value from the group rules
      const eemValue = group.rules.find(rule => rule.eem && rule.eem.trim() !== '' && rule.eem !== 'N/A')?.eem || '';
      
      detailedResults.push({
        column: baseColumn,
        question: group.questionName,
        section: group.section,
        eem: eemValue,
        genero: group.genero,
        omecPotential: group.potencial_omec,
        expectedValue: `Máximo: ${group.maxPossibleScore}`,
        actualValue: actualValues.join(', ') || 'No respondido',
        score: score,
        maxScore: group.maxPossibleScore,
        type: 'multiple_max',
        multipleMaxDetails: detailedInfo
      });

      totalScore += score;
      // Don't add to maxPossibleScore here since it's already calculated
      processedMultipleMaxColumns.add(baseColumn);
      
      console.log(`Multiple max question ${baseColumn} scored: ${score}/${group.maxPossibleScore}`);
    }
    
    // Process remaining questions (select and value types)
    for (const column of submissionColumns) {
      // Skip if this column was already processed as part of a multiple_max group
      if (processedMultipleMaxColumns.has(column)) {
        continue;
      }
      
      // Find all rules that apply to this column
      const columnRules = this.getRulesForColumn(column);
      
      if (columnRules.length === 0) {
        console.log(`No scoring rules found for column: ${column}`);
        continue;
      }
      
      console.log(`Found ${columnRules.length} rules for column: ${column}`);
      const actualValue = this.extractValue(submission, column);
      console.log(`Column ${column} has value: ${actualValue}`);
      
      // Evaluate each rule for this column
      for (const rule of columnRules) {
        const score = this.calculateScore(rule, actualValue);
        console.log(`Rule ${rule.name} (${rule.type}) scored: ${score}/${rule.score}`);
        
        detailedResults.push({
          column: rule.column,
          question: rule.name,
          section: rule.section,
          eem: rule.eem,
          genero: rule.genero,
          omecPotential: rule.potencial_omec,
          expectedValue: rule.value,
          actualValue: actualValue || 'No respondido',
          score: score,
          maxScore: rule.score,
          type: rule.type
        });

        totalScore += score;
        // Don't add to maxPossibleScore here since it's already calculated
      }
    }

    // Now add all unanswered questions for each category to show complete picture
    const categoryMaxScores = this.calculateCategoryMaxScores();
    
    // Add unanswered EEM questions
    for (const [eemCategory, maxScore] of categoryMaxScores.eem) {
      const eemRules = this.scoringRules.filter(rule => 
        rule.eem === eemCategory && rule.type !== 'multiple_max'
      );

      // Group by column to avoid duplicates
      const eemColumns = new Map<string, ScoringRule>();
      for (const rule of eemRules) {
        if (!eemColumns.has(rule.column)) {
          eemColumns.set(rule.column, rule);
        } else {
          // Keep the rule with the highest score
          const existingRule = eemColumns.get(rule.column)!;
          if (rule.score > existingRule.score) {
            eemColumns.set(rule.column, rule);
          }
        }
      }

      // Add unanswered questions
      for (const [column, rule] of eemColumns) {
        const exists = detailedResults.some(result => 
          result.column === column && result.eem === eemCategory
        );
        
        if (!exists) {
          detailedResults.push({
            column: rule.column,
            question: rule.name,
            section: rule.section,
            eem: rule.eem,
            genero: rule.genero,
            omecPotential: rule.potencial_omec,
            expectedValue: rule.value,
            actualValue: 'No respondido',
            score: 0, // Unanswered questions get 0 points
            maxScore: rule.score,
            type: rule.type
          });
        }
      }
    }

    // Add unanswered Género questions
    for (const [generoCategory, maxScore] of categoryMaxScores.genero) {
      const generoRules = this.scoringRules.filter(rule => 
        rule.genero === generoCategory && rule.type !== 'multiple_max'
      );

      const generoColumns = new Map<string, ScoringRule>();
      for (const rule of generoRules) {
        if (!generoColumns.has(rule.column)) {
          generoColumns.set(rule.column, rule);
        } else {
          const existingRule = generoColumns.get(rule.column)!;
          if (rule.score > existingRule.score) {
            generoColumns.set(rule.column, rule);
          }
        }
      }

      for (const [column, rule] of generoColumns) {
        const exists = detailedResults.some(result => 
          result.column === column && result.genero === generoCategory
        );
        
        if (!exists) {
          detailedResults.push({
            column: rule.column,
            question: rule.name,
            section: rule.section,
            eem: rule.eem,
            genero: rule.genero,
            omecPotential: rule.potencial_omec,
            expectedValue: rule.value,
            actualValue: 'No respondido',
            score: 0,
            maxScore: rule.score,
            type: rule.type
          });
        }
      }
    }

    // Add unanswered Potencial OMEC questions
    for (const [omecCategory, maxScore] of categoryMaxScores.omecPotential) {
      const omecRules = this.scoringRules.filter(rule => 
        rule.potencial_omec === omecCategory && rule.type !== 'multiple_max'
      );

      const omecColumns = new Map<string, ScoringRule>();
      for (const rule of omecRules) {
        if (!omecColumns.has(rule.column)) {
          omecColumns.set(rule.column, rule);
        } else {
          const existingRule = omecColumns.get(rule.column)!;
          if (rule.score > existingRule.score) {
            omecColumns.set(rule.column, rule);
          }
        }
      }

      for (const [column, rule] of omecColumns) {
        const exists = detailedResults.some(result => 
          result.column === column && result.omecPotential === omecCategory
        );
        
        if (!exists) {
          detailedResults.push({
            column: rule.column,
            question: rule.name,
            section: rule.section,
            eem: rule.eem,
            genero: rule.genero,
            omecPotential: rule.potencial_omec,
            expectedValue: rule.value,
            actualValue: 'No respondido',
            score: 0,
            maxScore: rule.score,
            type: rule.type
          });
        }
      }
    }

    // Calculate category scores
    const categoryScores = this.calculateCategoryScores(detailedResults);

    // Log category breakdown for debugging
    console.log('Category Scores Breakdown:');
    categoryScores.forEach(cat => {
      console.log(`  ${cat.categoryType.toUpperCase()} - ${cat.category}: ${cat.score}/${cat.maxScore} (${cat.percentage.toFixed(2)}%) - ${cat.questionCount} questions`);
    });

    const result = {
      totalScore,
      maxPossibleScore,
      percentage: maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0,
      categoryScores,
      detailedResults
    };

    // Ensure percentage is calculated with proper precision
    result.percentage = Math.round(result.percentage * 100) / 100;

    // Validate the result
    const validation = this.validateScoringResult(result);
    if (!validation.isValid) {
      console.warn('Scoring validation failed:', validation.issues);
    }

    console.log(`Evaluation complete. Total score: ${totalScore}/${maxPossibleScore} (${result.percentage.toFixed(2)}%)`);
    console.log(`Raw percentage calculation: (${totalScore} / ${maxPossibleScore}) * 100 = ${((totalScore / maxPossibleScore) * 100).toFixed(6)}%`);
    console.log(`Final rounded percentage: ${result.percentage.toFixed(6)}%`);
    console.log(`Processed ${detailedResults.length} rules across ${submissionColumns.length} columns`);
    
    return result;
  }

  private calculateMultipleMaxScore(group: GroupedMultipleMaxRule, submission: KoboToolBoxSubmission): number {
    let totalScore = 0;
    
    // Get the base column value from the submission
    const baseColumnValue = this.extractValue(submission, group.baseColumn);
    if (!baseColumnValue) {
      return 0;
    }
    
    // Split the submission value into individual options (space-separated)
    const selectedOptions = baseColumnValue.split(' ').filter(option => option.trim() !== '');
    console.log(`Multiple max question ${group.baseColumn}: submission value="${baseColumnValue}", selected options=`, selectedOptions);
    
    for (const rule of group.rules) {
      // Extract the option name from the rule column (e.g., "sitio_ramsar" from "_0308_categ_otras/sitio_ramsar")
      const optionName = rule.column.split('/').pop();
      if (!optionName) continue;
      
      // Check if this option is selected in the submission
      const isSelected = selectedOptions.includes(optionName);
      console.log(`  Option ${optionName}: selected=${isSelected}, score=${rule.score}`);
      
      if (isSelected) {
        totalScore += rule.score;
      }
    }
    
    // Cap the score at the maximum possible score for this question group
    const finalScore = Math.min(totalScore, group.maxPossibleScore);
    console.log(`Multiple max question ${group.baseColumn}: final score=${finalScore}/${group.maxPossibleScore}`);
    
    return finalScore;
  }

  private extractMultipleMaxValues(submission: KoboToolBoxSubmission, baseColumn: string): string[] {
    const values: string[] = [];
    
    // Get the base column value from the submission
    const baseColumnValue = this.extractValue(submission, baseColumn);
    if (!baseColumnValue) {
      return values;
    }
    
    // Split the submission value into individual options (space-separated)
    const selectedOptions = baseColumnValue.split(' ').filter(option => option.trim() !== '');
    
    // For each selected option, find the corresponding rule and add its display name
    for (const optionName of selectedOptions) {
      const group = this.groupedMultipleMaxRules.get(baseColumn);
      if (group) {
        // Find the rule that matches this option
        const matchingRule = group.rules.find(rule => {
          const ruleOptionName = rule.column.split('/').pop();
          return ruleOptionName === optionName;
        });
        
        if (matchingRule) {
          // Use the rule's name as the display value, or the option name if no name is available
          const displayValue = matchingRule.name || optionName;
          values.push(displayValue);
        } else {
          // Fallback to the option name if no matching rule is found
          values.push(optionName);
        }
      }
    }
    
    return values;
  }

  // New method to get detailed information about multiple max options
  private getDetailedMultipleMaxInfo(submission: KoboToolBoxSubmission, baseColumn: string): Array<{
    optionName: string;
    displayName: string;
    isSelected: boolean;
    score: number;
    column: string;
  }> {
    const detailedInfo: Array<{
      optionName: string;
      displayName: string;
      isSelected: boolean;
      score: number;
      column: string;
    }> = [];
    
    const group = this.groupedMultipleMaxRules.get(baseColumn);
    if (!group) {
      return detailedInfo;
    }
    
    // Get the base column value from the submission
    const baseColumnValue = this.extractValue(submission, baseColumn);
    const selectedOptions = baseColumnValue ? baseColumnValue.split(' ').filter(option => option.trim() !== '') : [];
    
    // Process each rule to show all options with their selection status
    for (const rule of group.rules) {
      const optionName = rule.column.split('/').pop() || '';
      const isSelected = selectedOptions.includes(optionName);
      
      // Clean up the display name by removing the repetitive question text
      let displayName = rule.name || optionName;
      if (displayName.includes('/')) {
        // Extract only the part after the last slash (the actual option name)
        displayName = displayName.split('/').pop() || optionName;
      }
      
      detailedInfo.push({
        optionName,
        displayName,
        isSelected,
        score: rule.score,
        column: rule.column
      });
    }
    
    return detailedInfo;
  }

  private extractValue(submission: KoboToolBoxSubmission, column: string): string | null {
    // Try direct column access first
    if (submission[column] !== undefined && submission[column] !== null && submission[column] !== '') {
      return String(submission[column]);
    }
    
    // If direct access fails, try to find the field by searching for partial matches
    // This handles cases where the field name includes group prefixes
    for (const [key, value] of Object.entries(submission)) {
      if (key.endsWith(column) && value !== null && value !== undefined && value !== '') {
        console.log(`Found field ${column} in submission key ${key} with value: ${value}`);
        return String(value);
      }
    }
    
    // If still not found, try to extract from nested structure
    // Column name in submission might include category and group, extract the last value
    const lastValue = column.split('/').pop();
    if (lastValue && submission[lastValue] !== undefined && submission[lastValue] !== null && submission[lastValue] !== '') {
      return String(submission[lastValue]);
    }
    
    console.log(`Field ${column} not found in submission. Available fields:`, Object.keys(submission).filter(k => k.includes(column.split('/').pop() || '')));
    return null;
  }

  private calculateScore(rule: ScoringRule, actualValue: string | null): number {
    if (!actualValue) return 0;

    switch (rule.type) {
      case 'select':
        // Exact match for select type
        return actualValue === rule.value ? rule.score : 0;
      
      case 'multiple_max':
        // This should not be called directly anymore - handled by calculateMultipleMaxScore
        console.warn(`Multiple max rule ${rule.column} should be handled by calculateMultipleMaxScore`);
        return 0;
      
      case 'value':
        // For numeric values, implement range-based scoring
        return this.calculateNumericScore(rule, actualValue);
      
      default:
        // Default to exact match
        return actualValue === rule.value ? rule.score : 0;
    }
  }

  private calculateNumericScore(rule: ScoringRule, actualValue: string): number {
    const numericValue = parseFloat(actualValue);
    if (isNaN(numericValue)) return 0;

    // Implement specific numeric scoring logic based on the field
    // This can be customized based on specific requirements
    switch (rule.column) {
      case '_0309_tam_ha_001': // Area size
        if (numericValue >= 10000) return Math.min(3, rule.score);
        if (numericValue >= 1000) return Math.min(2, rule.score);
        if (numericValue >= 100) return Math.min(1, rule.score);
        return 0;
      
      case '_040502_num_guardabosq_x_ha': // Number of rangers
        if (numericValue >= 5) return Math.min(3, rule.score);
        if (numericValue >= 2) return Math.min(2, rule.score);
        if (numericValue >= 1) return Math.min(1, rule.score);
        return 0;
      
      default:
        // Default scoring for numeric values - ensure we don't exceed the rule's max score
        return numericValue > 0 ? Math.min(rule.score, numericValue) : 0;
    }
  }

  private calculateCategoryScores(detailedResults: DetailedResult[]): CategoryScore[] {
    const categoryMaxScores = this.calculateCategoryMaxScores();

    // Initialize all categories with their max scores from rules
    const eemScores = Array.from(categoryMaxScores.eem.entries()).map(([eem, maxScore]) => ({
      category: eem || 'Sin EEM',
      categoryType: 'eem' as const,
      score: 0, // Will be calculated from detailed results
      maxScore: maxScore,
      percentage: 0, // Will be calculated from detailed results
      questionCount: 0 // Will be calculated from detailed results
    }));

    const generoScores = Array.from(categoryMaxScores.genero.entries()).map(([genero, maxScore]) => ({
      category: genero || 'Sin género',
      categoryType: 'genero' as const,
      score: 0, // Will be calculated from detailed results
      maxScore: maxScore,
      percentage: 0, // Will be calculated from detailed results
      questionCount: 0 // Will be calculated from detailed results
    }));

    const omecPotentialScores = Array.from(categoryMaxScores.omecPotential.entries()).map(([potential, maxScore]) => ({
      category: potential || 'Sin potencial OMEC',
      categoryType: 'potencial_omec' as const,
      score: 0, // Will be calculated from detailed results
      maxScore: maxScore,
      percentage: 0, // Will be calculated from detailed results
      questionCount: 0 // Will be calculated from detailed results
    }));

    // Track unique columns for each category to avoid counting the same question multiple times
    const eemUniqueColumns = new Set<string>();
    const generoUniqueColumns = new Set<string>();
    const omecPotentialUniqueColumns = new Set<string>();

    // Process detailed results to populate scores and question counts
    for (const result of detailedResults) {
      // Process EEM category
      if (result.eem && result.eem.trim() !== '' && result.eem !== 'N/A') {
        const categoryData = eemScores.find(cat => cat.category === result.eem);
        if (categoryData) {
          categoryData.score += result.score;
          // Only count the column once
          if (!eemUniqueColumns.has(result.column)) {
            eemUniqueColumns.add(result.column);
            categoryData.questionCount++;
          }
        }
      }

      // Process Género category
      if (result.genero && result.genero.trim() !== '' && result.genero !== 'N/A') {
        const categoryData = generoScores.find(cat => cat.category === result.genero);
        if (categoryData) {
          categoryData.score += result.score;
          // Only count the column once
          if (!generoUniqueColumns.has(result.column)) {
            generoUniqueColumns.add(result.column);
            categoryData.questionCount++;
          }
        }
      }

      // Process Potencial OMEC category
      if (result.omecPotential && result.omecPotential.trim() !== '' && result.omecPotential !== 'N/A') {
        const categoryData = omecPotentialScores.find(cat => cat.category === result.omecPotential);
        if (categoryData) {
          categoryData.score += result.score;
          // Only count the column once
          if (!omecPotentialUniqueColumns.has(result.column)) {
            omecPotentialUniqueColumns.add(result.column);
            categoryData.questionCount++;
          }
        }
      }
    }

    // Calculate percentages based on the calculated scores and max scores
    eemScores.forEach(cat => {
      cat.percentage = cat.maxScore > 0 ? (cat.score / cat.maxScore) * 100 : 0;
    });
    generoScores.forEach(cat => {
      cat.percentage = cat.maxScore > 0 ? (cat.score / cat.maxScore) * 100 : 0;
    });
    omecPotentialScores.forEach(cat => {
      cat.percentage = cat.maxScore > 0 ? (cat.score / cat.maxScore) * 100 : 0;
    });

    // Log the final category scores for debugging
    console.log('Final category scores:');
    [...eemScores, ...generoScores, ...omecPotentialScores].forEach(cat => {
      console.log(`  ${cat.categoryType.toUpperCase()} - ${cat.category}: ${cat.score}/${cat.maxScore} (${cat.percentage.toFixed(2)}%) - ${cat.questionCount} questions`);
    });

    return [...eemScores, ...generoScores, ...omecPotentialScores];
  }

  private getSubmissionColumns(submission: KoboToolBoxSubmission): string[] {
    const columns: string[] = [];
    
    // Extract column names from submission object
    for (const [key, value] of Object.entries(submission)) {
      // Skip internal fields, empty values, and non-form fields
      if (
        key.startsWith('_') && 
        key !== '_validation_status' && 
        key !== '_submission_time' && 
        key !== '_submitted_by' && 
        key !== '_xform_id_string' && 
        key !== '_uuid' &&
        value !== null && 
        value !== undefined && 
        value !== '' &&
        typeof value !== 'object'
      ) {
        columns.push(key);
      }
    }
    
    return columns;
  }

  getScoringRules(): ScoringRule[] {
    return this.scoringRules;
  }

  getSections(): string[] {
    return [...new Set(this.scoringRules.map(rule => rule.section).filter(Boolean))];
  }

  getEemCategories(): string[] {
    return [...new Set(this.scoringRules.map(rule => rule.eem).filter(Boolean))];
  }

  getGenderCategories(): string[] {
    return [...new Set(this.scoringRules.map(rule => rule.genero).filter(Boolean))];
  }

  getOmecPotentialCategories(): string[] {
    return [...new Set(this.scoringRules.map(rule => rule.potencial_omec).filter(Boolean))];
  }

  private getRulesForColumn(column: string): ScoringRule[] {
    // For multiple_max questions, return the base column rules
    const baseColumn = column.split('/')[0];
    if (this.groupedMultipleMaxRules.has(baseColumn)) {
      return this.groupedMultipleMaxRules.get(baseColumn)!.rules;
    }
    
    return this.scoringRules.filter(rule => rule.column === column);
  }

  private getRulesByType(type: ScoringRuleType): ScoringRule[] {
    if (type === 'multiple_max') {
      // Return one rule per group for multiple_max type
      return Array.from(this.groupedMultipleMaxRules.values()).map(group => ({
        column: group.baseColumn,
        name: group.questionName,
        section: group.section,
        eem: group.eem,
        genero: group.genero,
        potencial_omec: group.potencial_omec,
        value: `Máximo: ${group.maxPossibleScore}`,
        score: group.maxPossibleScore,
        type: 'multiple_max'
      }));
    }
    
    return this.scoringRules.filter(rule => rule.type === type);
  }

  getScoringRulesSummary(): {
    totalRules: number;
    rulesByType: Record<ScoringRuleType, number>;
    rulesByColumn: Record<string, number>;
    multipleMaxGroups: number;
  } {
    const rulesByType: Record<ScoringRuleType, number> = {
      select: 0,
      multiple_max: 0,
      value: 0
    };

    const rulesByColumn: Record<string, number> = {};

    for (const rule of this.scoringRules) {
      rulesByType[rule.type]++;
      rulesByColumn[rule.column] = (rulesByColumn[rule.column] || 0) + 1;
    }

    return {
      totalRules: this.scoringRules.length,
      rulesByType,
      rulesByColumn,
      multipleMaxGroups: this.groupedMultipleMaxRules.size
    };
  }

  // Get grouped multiple max rules for external use
  getGroupedMultipleMaxRules(): Map<string, GroupedMultipleMaxRule> {
    return new Map(this.groupedMultipleMaxRules);
  }

  // Get rules for a specific multiple max question group
  getMultipleMaxRulesForColumn(baseColumn: string): GroupedMultipleMaxRule | undefined {
    return this.groupedMultipleMaxRules.get(baseColumn);
  }

  // Test method for multiple_max scoring logic
  testMultipleMaxScoring(): void {
    console.log('Testing multiple_max scoring logic...');
    
    // Mock submission data for question 3.8
    const mockSubmission = {
      '_0308_categ_otras': 'sitio_ramsar reserva_biosfera corredor_conservacion socio_bosque kba'
    } as unknown as KoboToolBoxSubmission;
    
    // Mock scoring rules for question 3.8
    const mockRules: ScoringRule[] = [
      {
        column: '_0308_categ_otras/sitio_ramsar',
        name: 'Sitio RAMSAR',
        section: 'area_conservacion',
        eem: '',
        genero: '',
        potencial_omec: '',
        value: '',
        score: 1,
        type: 'multiple_max'
      },
      {
        column: '_0308_categ_otras/reserva_biosfera',
        name: 'Reserva de Biosfera',
        section: 'area_conservacion',
        eem: '',
        genero: '',
        potencial_omec: '',
        value: '',
        score: 1,
        type: 'multiple_max'
      },
      {
        column: '_0308_categ_otras/corredor_conservacion',
        name: 'Corredor de Conservación',
        section: 'area_conservacion',
        eem: '',
        genero: '',
        potencial_omec: '',
        value: '',
        score: 1,
        type: 'multiple_max'
      },
      {
        column: '_0308_categ_otras/socio_bosque',
        name: 'Socio Bosque',
        section: 'area_conservacion',
        eem: '',
        genero: '',
        potencial_omec: '',
        value: '',
        score: 1,
        type: 'multiple_max'
      },
      {
        column: '_0308_categ_otras/kba',
        name: 'KBA',
        section: 'area_conservacion',
        eem: '',
        genero: '',
        potencial_omec: '',
        value: '',
        score: 1,
        type: 'multiple_max'
      },
      {
        column: '_0308_categ_otras/otras',
        name: 'Otras',
        section: 'area_conservacion',
        eem: '',
        genero: '',
        potencial_omec: '',
        value: '',
        score: 1,
        type: 'multiple_max'
      }
    ];
    
    // Create a mock group
    const mockGroup: GroupedMultipleMaxRule = {
      baseColumn: '_0308_categ_otras',
      rules: mockRules,
      maxPossibleScore: 6,
      questionName: '3.8. ¿Qué otras categorías nacionales o internacionales de conservación pueden aplicarse al Área?',
      section: 'area_conservacion',
      eem: '',
      genero: '',
      potencial_omec: ''
    };
    
    // Test the scoring logic
    const score = this.calculateMultipleMaxScore(mockGroup, mockSubmission);
    const values = this.extractMultipleMaxValues(mockSubmission, '_0308_categ_otras');
    
    console.log('Test results:');
    console.log('  Expected score: 5/6');
    console.log('  Actual score:', score);
    console.log('  Selected values:', values);
    console.log('  Test passed:', score === 5);
  }

  validateScoringResult(result: ScoringResult): {
    isValid: boolean;
    issues: string[];
    expectedTotal: number;
    expectedMax: number;
    actualTotal: number;
    actualMax: number;
  } {
    const issues: string[] = [];
    
    // Calculate expected totals from detailed results
    const expectedTotal = result.detailedResults.reduce((sum, detail) => sum + detail.score, 0);
    const expectedMax = result.detailedResults.reduce((sum, detail) => sum + detail.maxScore, 0);
    
    // Check if totals match
    if (Math.abs(expectedTotal - result.totalScore) > 0.01) {
      issues.push(`Total score mismatch: expected ${expectedTotal}, got ${result.totalScore}`);
    }
    
    if (Math.abs(expectedMax - result.maxPossibleScore) > 0.01) {
      issues.push(`Max score mismatch: expected ${expectedMax}, got ${result.maxPossibleScore}`);
    }
    
    // Check if percentage calculation is correct
    const expectedPercentage = expectedMax > 0 ? (expectedTotal / expectedMax) * 100 : 0;
    if (Math.abs(expectedPercentage - result.percentage) > 0.01) {
      issues.push(`Percentage mismatch: expected ${expectedPercentage.toFixed(2)}%, got ${result.percentage.toFixed(2)}%`);
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      expectedTotal,
      expectedMax,
      actualTotal: result.totalScore,
      actualMax: result.maxPossibleScore
    };
  }
}

export const scoringService = new ScoringService();
