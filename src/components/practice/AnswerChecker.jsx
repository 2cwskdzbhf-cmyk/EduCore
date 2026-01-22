// Robust answer checking with fraction equivalence
export class AnswerChecker {
  static gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a;
  }

  static parseFraction(input) {
    if (!input || typeof input !== 'string') return null;
    
    input = input.trim().replace(/\s+/g, '');
    
    // Mixed number: "1 1/2" or "1_1/2"
    const mixedMatch = input.match(/^(-?\d+)[_\s]+(\d+)\/(\d+)$/);
    if (mixedMatch) {
      const whole = parseInt(mixedMatch[1]);
      const num = parseInt(mixedMatch[2]);
      const den = parseInt(mixedMatch[3]);
      if (den === 0) return null;
      const sign = whole < 0 ? -1 : 1;
      return {
        numerator: Math.abs(whole) * den + num * sign,
        denominator: den
      };
    }
    
    // Regular fraction: "3/4" or "-3/4"
    const fracMatch = input.match(/^(-?\d+)\/(\d+)$/);
    if (fracMatch) {
      const num = parseInt(fracMatch[1]);
      const den = parseInt(fracMatch[2]);
      if (den === 0) return null;
      return { numerator: num, denominator: den };
    }
    
    // Decimal: "0.5" or "-0.5"
    const decMatch = input.match(/^-?\d+\.?\d*$/);
    if (decMatch) {
      const decimal = parseFloat(input);
      if (isNaN(decimal)) return null;
      // Convert to fraction (approximation)
      const precision = 1000000;
      const num = Math.round(decimal * precision);
      const gcd = this.gcd(num, precision);
      return {
        numerator: num / gcd,
        denominator: precision / gcd
      };
    }
    
    // Integer: "3" or "-3"
    const intMatch = input.match(/^-?\d+$/);
    if (intMatch) {
      return { numerator: parseInt(input), denominator: 1 };
    }
    
    return null;
  }

  static simplifyFraction(num, den) {
    if (den === 0) return null;
    const gcd = this.gcd(num, den);
    return {
      numerator: num / gcd,
      denominator: den / gcd
    };
  }

  static compareFractions(frac1, frac2) {
    if (!frac1 || !frac2) return false;
    const s1 = this.simplifyFraction(frac1.numerator, frac1.denominator);
    const s2 = this.simplifyFraction(frac2.numerator, frac2.denominator);
    if (!s1 || !s2) return false;
    return s1.numerator === s2.numerator && s1.denominator === s2.denominator;
  }

  static checkAnswer(studentInput, correctAnswer, allowedForms = ['fraction', 'decimal', 'mixed']) {
    if (!studentInput || !correctAnswer) return false;
    
    const studentFrac = this.parseFraction(studentInput);
    const correctFrac = this.parseFraction(correctAnswer);
    
    if (!studentFrac || !correctFrac) return false;
    
    return this.compareFractions(studentFrac, correctFrac);
  }

  static formatFraction(numerator, denominator) {
    if (denominator === 1) return numerator.toString();
    if (denominator === 0) return 'undefined';
    
    const simplified = this.simplifyFraction(numerator, denominator);
    if (!simplified) return 'error';
    
    const { numerator: n, denominator: d } = simplified;
    
    // Check if it's a mixed number
    if (Math.abs(n) > d) {
      const whole = Math.floor(Math.abs(n) / d) * (n < 0 ? -1 : 1);
      const remainder = Math.abs(n) % d;
      if (remainder === 0) return whole.toString();
      return `${whole} ${remainder}/${d}`;
    }
    
    return `${n}/${d}`;
  }
}

export default AnswerChecker;