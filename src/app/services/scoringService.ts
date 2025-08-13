import { KoboToolBoxSubmission } from './koboToolBox';

export type ScoringRuleType = 'select' | 'multiple_max' | 'value';

export type Section = 'area_conservacion' | 'gestion' | 'caracteristicas_area';

export interface ScoringRule {
  column: string;
  name: string;
  section: string;
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
  genero: string;
  potencial_omec: string;
}

export interface ScoringResult {
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  sectionScores: SectionScore[];
  genderScores: GenderScore[];
  omecPotentialScores: OmecPotentialScore[];
  detailedResults: DetailedResult[];
}

export interface SectionScore {
  section: string;
  score: number;
  maxScore: number;
  percentage: number;
  questionCount: number;
}

export interface GenderScore {
  gender: string;
  score: number;
  maxScore: number;
  percentage: number;
  questionCount: number;
}

export interface OmecPotentialScore {
  potential: string;
  score: number;
  maxScore: number;
  percentage: number;
  questionCount: number;
}

export interface DetailedResult {
  column: string;
  question: string;
  section: string;
  gender: string;
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

  async evaluateSubmission(submission: KoboToolBoxSubmission): Promise<ScoringResult> {
    if (this.scoringRules.length === 0) {
      await this.loadScoringRules();
    }

    const detailedResults: DetailedResult[] = [];
    let totalScore = 0;
    let maxPossibleScore = 0;

    // Get all unique columns from submission that have values
    const submissionColumns = this.getSubmissionColumns(submission);
    console.log(`Evaluating submission with ${submissionColumns.length} columns:`, submissionColumns);
    
    // Process multiple_max questions first
    const processedMultipleMaxColumns = new Set<string>();
    for (const [baseColumn, group] of this.groupedMultipleMaxRules) {
      const score = this.calculateMultipleMaxScore(group, submission);
      const actualValues = this.extractMultipleMaxValues(submission, baseColumn);
      const detailedInfo = this.getDetailedMultipleMaxInfo(submission, baseColumn);
      
      detailedResults.push({
        column: baseColumn,
        question: group.questionName,
        section: group.section,
        gender: group.genero,
        omecPotential: group.potencial_omec,
        expectedValue: `Máximo: ${group.maxPossibleScore}`,
        actualValue: actualValues.join(', ') || 'No respondido',
        score: score,
        maxScore: group.maxPossibleScore,
        type: 'multiple_max',
        multipleMaxDetails: detailedInfo
      });

      totalScore += score;
      maxPossibleScore += group.maxPossibleScore;
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
          gender: rule.genero,
          omecPotential: rule.potencial_omec,
          expectedValue: rule.value,
          actualValue: actualValue || 'No respondido',
          score: score,
          maxScore: rule.score,
          type: rule.type
        });

        totalScore += score;
        maxPossibleScore += rule.score;
      }
    }

    // Calculate section scores
    const sectionScores = this.calculateSectionScores(detailedResults);
    
    // Calculate gender scores
    const genderScores = this.calculateGenderScores(detailedResults);
    
    // Calculate OMEC potential scores
    const omecPotentialScores = this.calculateOmecPotentialScores(detailedResults);

    const result = {
      totalScore,
      maxPossibleScore,
      percentage: maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0,
      sectionScores,
      genderScores,
      omecPotentialScores,
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

  private calculateSectionScores(detailedResults: DetailedResult[]): SectionScore[] {
    const sectionMap = new Map<string, { score: number; maxScore: number; uniqueQuestions: Set<string>; questionMaxScores: Map<string, number> }>();

    for (const result of detailedResults) {
      if (!result.section) continue;
      
      const current = sectionMap.get(result.section) || { 
        score: 0, 
        maxScore: 0, 
        uniqueQuestions: new Set(),
        questionMaxScores: new Map()
      };
      
      current.score += result.score;
      
      // Only add maxScore once per unique question (column), but use the highest maxScore
      if (!current.questionMaxScores.has(result.column)) {
        current.questionMaxScores.set(result.column, result.maxScore);
        current.maxScore += result.maxScore;
      } else {
        // Update if we find a higher maxScore for this question
        const currentMax = current.questionMaxScores.get(result.column)!;
        if (result.maxScore > currentMax) {
          current.maxScore = current.maxScore - currentMax + result.maxScore;
          current.questionMaxScores.set(result.column, result.maxScore);
        }
      }
      
      current.uniqueQuestions.add(result.column);
      sectionMap.set(result.section, current);
    }

    return Array.from(sectionMap.entries()).map(([section, data]) => ({
      section,
      score: data.score,
      maxScore: data.maxScore,
      percentage: data.maxScore > 0 ? (data.score / data.maxScore) * 100 : 0,
      questionCount: data.uniqueQuestions.size
    }));
  }

  private calculateGenderScores(detailedResults: DetailedResult[]): GenderScore[] {
    const genderMap = new Map<string, { score: number; maxScore: number; uniqueQuestions: Set<string>; questionMaxScores: Map<string, number> }>();

    for (const result of detailedResults) {
      if (!result.gender) continue;
      
      const current = genderMap.get(result.gender) || { 
        score: 0, 
        maxScore: 0, 
        uniqueQuestions: new Set(),
        questionMaxScores: new Map()
      };
      
      current.score += result.score;
      
      // Only add maxScore once per unique question (column), but use the highest maxScore
      if (!current.questionMaxScores.has(result.column)) {
        current.questionMaxScores.set(result.column, result.maxScore);
        current.maxScore += result.maxScore;
      } else {
        // Update if we find a higher maxScore for this question
        const currentMax = current.questionMaxScores.get(result.column)!;
        if (result.maxScore > currentMax) {
          current.maxScore = current.maxScore - currentMax + result.maxScore;
          current.questionMaxScores.set(result.column, result.maxScore);
        }
      }
      
      current.uniqueQuestions.add(result.column);
      genderMap.set(result.gender, current);
    }

    return Array.from(genderMap.entries()).map(([gender, data]) => ({
      gender: gender || 'Sin género',
      score: data.score,
      maxScore: data.maxScore,
      percentage: data.maxScore > 0 ? (data.score / data.maxScore) * 100 : 0,
      questionCount: data.uniqueQuestions.size
    }));
  }

  private calculateOmecPotentialScores(detailedResults: DetailedResult[]): OmecPotentialScore[] {
    const potentialMap = new Map<string, { score: number; maxScore: number; uniqueQuestions: Set<string>; questionMaxScores: Map<string, number> }>();

    for (const result of detailedResults) {
      if (!result.omecPotential) continue;
      
      const current = potentialMap.get(result.omecPotential) || { 
        score: 0, 
        maxScore: 0, 
        uniqueQuestions: new Set(),
        questionMaxScores: new Map()
      };
      
      current.score += result.score;
      
      // Only add maxScore once per unique question (column), but use the highest maxScore
      if (!current.questionMaxScores.has(result.column)) {
        current.questionMaxScores.set(result.column, result.maxScore);
        current.maxScore += result.maxScore;
      } else {
        // Update if we find a higher maxScore for this question
        const currentMax = current.questionMaxScores.get(result.column)!;
        if (result.maxScore > currentMax) {
          current.maxScore = current.maxScore - currentMax + result.maxScore;
          current.questionMaxScores.set(result.column, result.maxScore);
        }
      }
      
      current.uniqueQuestions.add(result.column);
      potentialMap.set(result.omecPotential, current);
    }

    return Array.from(potentialMap.entries()).map(([potential, data]) => ({
      potential: potential || 'Sin potencial OMEC',
      score: data.score,
      maxScore: data.maxScore,
      percentage: data.maxScore > 0 ? (data.score / data.maxScore) * 100 : 0,
      questionCount: data.uniqueQuestions.size
    }));
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
