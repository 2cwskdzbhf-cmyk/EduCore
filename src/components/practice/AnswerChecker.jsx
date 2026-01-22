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
    
    const trimmed = input.replace(/\s+/g, ' ').trim();
    
    // Mixed number: "1 1/2" with spaces
    const mixedMatch = trimmed.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
    if (mixedMatch) {
      const whole = parseInt(mixedMatch[1]);
      const num = parseInt(mixedMatch[2]);
      const den = parseInt(mixedMatch[3]);
      if (den === 0 || isNaN(den) || isNaN(num)) return null;
      const sign = whole < 0 ? -1 : 1;
      return {
        numerator: Math.abs(whole) * den * sign + num * sign,
        denominator: den
      };
    }
    
    // Regular fraction: "3/4" or "3 / 4"
    const fracMatch = trimmed.match(/^(-?\d+)\s*\/\s*(\d+)$/);
    if (fracMatch) {
      const num = parseInt(fracMatch[1]);
      const den = parseInt(fracMatch[2]);
      if (den === 0 || isNaN(den) || isNaN(num)) return null;
      return { numerator: num, denominator: den };
    }
    
    // Decimal: "0.5" or "-0.5"
    const decMatch = trimmed.match(/^-?\d*\.?\d+$/);
    if (decMatch) {
      const decimal = parseFloat(trimmed);
      if (isNaN(decimal)) return null;
      
      const decimalStr = trimmed.includes('.') ? trimmed.split('.')[1] : '';
      const decimalPlaces = decimalStr.length;
      if (decimalPlaces === 0) {
        return { numerator: parseInt(trimmed), denominator: 1 };
      }
      
      const precision = Math.pow(10, decimalPlaces);
      const num = Math.round(decimal * precision);
      const gcd = this.gcd(Math.abs(num), precision);
      return {
        numerator: num / gcd,
        denominator: precision / gcd
      };
    }
    
    // Integer: "3" or "-3"
    const intMatch = trimmed.match(/^-?\d+$/);
    if (intMatch) {
      const val = parseInt(trimmed);
      if (isNaN(val)) return null;
      return { numerator: val, denominator: 1 };
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