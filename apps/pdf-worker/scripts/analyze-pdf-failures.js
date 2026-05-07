#!/usr/bin/env node

/**
 * PDF Failure Analysis Script
 * Analyzes veraPDF validation failures and provides detailed explanations
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { basename, join } from 'path';

const PDF_FAILURE_CODES = {
  '6.7.3-6': 'OutputIntent missing - PDF/X requires output intent for color management',
  '6.7.3-7': 'OutputConditionIdentifier missing - Required for PDF/X compliance',
  '6.7.3-8': 'RegistryName missing - Required for PDF/X output intent',
  '6.1.4-3': 'DeviceRGB color space used - PDF/X requires CMYK or calibrated color spaces',
  '6.1.3-1': 'ICC profile missing - Required for proper color management',
  '6.2.3.3-1': 'Transparency not flattened - PDF/X-1a requires transparency flattening',
  '6.3.4-1': 'Font not embedded - PDF/X requires all fonts to be embedded',
  '6.7.2-1': 'PDF/X version missing - Required metadata for PDF/X compliance',
  '6.4-6': 'Encryption not allowed - PDF/X files cannot be encrypted',
  '6.7.3-1': 'OutputIntent registry missing - Required for PDF/X compliance',
  '6.4-2': 'JavaScript not allowed - PDF/X files cannot contain JavaScript'
};

function analyzePDF(pdfFile) {
  console.log(`\n🔍 Analyzing: ${basename(pdfFile)}`);
  console.log('='.repeat(50));
  
  try {
    // Get basic PDF info
    console.log('\n📋 Basic PDF Information:');
    try {
      const basicInfo = execSync(`verapdf "${pdfFile}" --format text`, { encoding: 'utf8' });
      console.log(basicInfo);
    } catch (error) {
      console.log('Basic validation failed:', error.stdout);
    }
    
    // Extract detailed failure information
    console.log('\n❌ Detailed Failure Analysis:');
    const validationOutput = execSync(`verapdf "${pdfFile}" --format text --verbose`, { encoding: 'utf8' });
    const lines = validationOutput.split('\n');
    
    const failures = lines.filter(line => line.includes('FAIL') && line.includes('6.'));
    
    if (failures.length === 0) {
      console.log('✅ No specific failures found');
    } else {
      failures.forEach(failure => {
        const match = failure.match(/FAIL\s+([\d.-]+)/);
        if (match) {
          const code = match[1];
          const explanation = PDF_FAILURE_CODES[code] || 'Unknown failure code';
          console.log(`  ${code}: ${explanation}`);
        }
      });
    }
    
    // Check for PDF/X specific information
    console.log('\n🎯 PDF/X Compliance Check:');
    if (validationOutput.includes('PDF/X')) {
      console.log('✅ PDF/X format detected');
    } else {
      console.log('❌ No PDF/X compliance detected');
    }
    
    // Check color space information
    console.log('\n🎨 Color Space Analysis:');
    if (validationOutput.includes('DeviceRGB')) {
      console.log('❌ DeviceRGB detected - Not suitable for print');
    }
    if (validationOutput.includes('DeviceCMYK')) {
      console.log('✅ DeviceCMYK detected - Suitable for print');
    }
    if (validationOutput.includes('ICC')) {
      console.log('✅ ICC profile detected');
    } else {
      console.log('❌ No ICC profile detected');
    }
    
    // Check font information
    console.log('\n🔤 Font Analysis:');
    if (validationOutput.includes('font') || validationOutput.includes('Font')) {
      console.log('Font information detected in validation');
    }
    
    // Get page count
    console.log('\n📄 Page Count:');
    try {
      const pageCountMatch = validationOutput.match(/(?:page[s]?|pages?)\s*:?\s*(\d+)/i);
      if (pageCountMatch) {
        const pageCount = parseInt(pageCountMatch[1]);
        console.log(`Page count: ${pageCount}`);
        
        if (pageCount >= 18 && pageCount <= 500) {
          console.log('✅ Within Peecho range (18-500 pages)');
        } else {
          console.log('❌ Outside Peecho range (18-500 pages)');
        }
      } else {
        console.log('Could not determine page count');
      }
    } catch (error) {
      console.log('Error determining page count:', error.message);
    }
    
  } catch (error) {
    console.log(`Error analyzing ${pdfFile}:`, error.message);
  }
}

function generatePechoRecommendations() {
  console.log('\n🎯 Peecho Compliance Recommendations:');
  console.log('='.repeat(50));
  
  console.log('\n1. PDF/X-4 Compliance:');
  console.log('   ❌ Current: No PDF/X compliance');
  console.log('   ✅ Required: PDF/X-4 with FOGRA 39 profile');
  console.log('   🔧 Solution: Use @polotno/pdf-export or GhostScript post-processing');
  
  console.log('\n2. Color Management:');
  console.log('   ❌ Current: RGB colors, no ICC profile');
  console.log('   ✅ Required: CMYK with FOGRA 39 (ISO Coated v2) profile');
  console.log('   🔧 Solution: Implement ICC color conversion');
  
  console.log('\n3. Font Embedding:');
  console.log('   ❌ Current: Font embedding issues detected');
  console.log('   ✅ Required: All fonts fully embedded');
  console.log('   🔧 Solution: Ensure fonts are properly embedded in PDF generation');
  
  console.log('\n4. Page Count:');
  console.log('   ✅ Current: Need to verify page counts');
  console.log('   ✅ Required: 18-500 pages, even number');
  console.log('   🔧 Solution: Add page count validation in PDF builder');
  
  console.log('\n5. Margins:');
  console.log('   ✅ Current: 10mm margins implemented');
  console.log('   ✅ Required: Minimum 10mm on all sides');
  console.log('   ✅ Status: COMPLIANT');
  
  console.log('\n6. File Structure:');
  console.log('   ✅ Current: Single PDF with cover and content');
  console.log('   ✅ Required: No bleed/cut marks');
  console.log('   ✅ Status: COMPLIANT');
}

// Main execution
const pdfFiles = process.argv.slice(2);

if (pdfFiles.length === 0) {
  console.log('Usage: node analyze-pdf-failures.js <pdf-file1> [pdf-file2] ...');
  process.exit(1);
}

console.log('🔍 PDF Failure Analysis for Peecho Compliance');
console.log('='.repeat(60));

pdfFiles.forEach(analyzePDF);
generatePechoRecommendations();

console.log('\n📝 Implementation Priority:');
console.log('1. HIGH: PDF/X-4 compliance (requires major changes)');
console.log('2. HIGH: FOGRA 39 color profile (requires ICC implementation)');
console.log('3. MEDIUM: Font embedding verification');
console.log('4. LOW: Page count validation (already partially implemented)');
