# PDF Validation Scripts

This directory contains reusable scripts for validating PDF files against Peecho printing requirements using veraPDF.

## Scripts Overview

### 1. validate-pdf.js (Recommended)
**Node.js script with detailed analysis and reporting**

```bash
# Validate sample booklets
npm run validate:samples

# Validate single file
node validate-pdf.js path/to/file.pdf

# Validate directory
node validate-pdf.js path/to/directory/

# Show help
node validate-pdf.js help
```

**Features:**
- Detailed Peecho requirements checklist
- Color-coded console output
- Markdown summary reports
- Individual file analysis
- Page count validation
- Font embedding checks
- Color profile detection

### 2. validate-pdf.sh
**Bash version for simple automation**

```bash
# Validate samples
./validate-pdf.sh samples

# Validate single file
./validate-pdf.sh path/to/file.pdf

# Show help
./validate-pdf.sh help
```

**Features:**
- Pure bash implementation
- No Node.js dependencies
- Basic validation and reporting
- Suitable for CI/CD pipelines

### 3. analyze-pdf-failures.js
**Detailed failure analysis for developers**

```bash
# Analyze specific files
node analyze-pdf-failures.js file1.pdf file2.pdf
```

**Features:**
- Detailed explanation of veraPDF failure codes
- Peecho-specific recommendations
- Implementation priority guidance
- Technical analysis of color spaces and fonts

## Validation Results

All validation results are stored in `../validation-results/` with the following structure:

```
validation-results/
├── samples/                    # Sample booklet validations
│   ├── booklet-name/
│   │   ├── validation-report.txt    # veraPDF raw output
│   │   ├── validation-console.log   # Console output
│   │   ├── status.txt               # PASS/FAIL/ERROR
│   │   └── peecho-checklist.txt     # Peecho requirements checklist
│   └── validation-summary.md       # Overall summary
├── single/                     # Single file validations
└── custom/                     # Custom directory validations
```

## Peecho Requirements Checked

### ✅ Currently Validated
- **Margins:** 10mm minimum on all sides
- **File Structure:** Single PDF with cover and content
- **No Bleed/Cut Marks:** Correctly omitted

### ❌ Critical Issues Found
- **PDF/X-4 Compliance:** Not implemented
- **Color Management:** RGB instead of CMYK with FOGRA 39
- **Font Embedding:** Issues detected
- **Page Count:** Validation needed

## Installation

### Prerequisites
1. **veraPDF** must be installed and available on PATH
2. **Node.js** (for JavaScript scripts)
3. **Java** (required by veraPDF)

### Install Dependencies
```bash
cd scripts/
npm install
```

### veraPDF Installation
```bash
# Download and install veraPDF
wget http://downloads.verapdf.org/rel/verapdf-installer.zip
unzip verapdf-installer.zip
cd verapdf-greenfield-*/
./verapdf-install
```

## Usage Examples

### Development Workflow
```bash
# 1. Generate PDF
npm run build

# 2. Validate against Peecho requirements
npm run validate:samples

# 3. Analyze any failures
node analyze-pdf-failures.js sample-booklets-do-not-commit/*.pdf

# 4. Review detailed results
cat validation-results/samples/validation-summary.md
```

### CI/CD Integration
```bash
# Add to CI pipeline
- name: Validate PDF for Peecho compliance
  run: |
    cd apps/pdf-worker/scripts
    npm install
    npm run validate:samples
    
    # Check if validation passed
    if [ ! -f "../validation-results/samples/validation-summary.md" ]; then
      echo "Validation report not found"
      exit 1
    fi
    
    # Fail if any PDFs are non-compliant
    if grep -q "Failed.*[1-9]" "../validation-results/samples/validation-summary.md"; then
      echo "PDF validation failed - see reports for details"
      exit 1
    fi
```

### Batch Processing
```bash
# Validate all PDFs in a directory
node validate-pdf.js /path/to/pdf/directory/

# Process multiple specific files
node validate-pdf.js file1.pdf file2.pdf file3.pdf
```

## Output Formats

### Console Output
```
PDF Validation Script for Peecho Requirements
================================================
Validating all PDFs in: /path/to/samples
Validating: /path/to/samples/booklet.pdf
✗ FAIL: booklet is not compliant
Checking Peecho requirements...
  ✗ No PDF/X compliance detected
  ⚠ Font embedding status unclear
  ⚠ Color profile information unclear
  ⚠ Could not determine page count
---
Summary report generated: /path/to/validation-summary.md
```

### Markdown Report
```markdown
# PDF Validation Summary

**Generated:** 2026-05-07T13:12:32.126Z
**Total Files:** 2
**Passed:** 0
**Failed:** 2
**Success Rate:** 0%

## Peecho Requirements Checklist

### booklet-name
**Status:** FAIL
- PDF/X: NO
- Fonts embedded: UNKNOWN
- Color profile: UNKNOWN
- Page count: UNKNOWN
```

## Troubleshooting

### Common Issues

1. **veraPDF not found**
   ```bash
   which verapdf  # Should return path
   export PATH=$PATH:/path/to/verapdf/bin
   ```

2. **Permission denied on scripts**
   ```bash
   chmod +x scripts/*.sh scripts/*.js
   ```

3. **No validation results generated**
   ```bash
   # Check veraPDF is working
   verapdf --version
   
   # Test with sample file
   verapdf sample-booklets-do-not-commit/booklet-a5-1.pdf
   ```

### Debug Mode
```bash
# Enable verbose output
DEBUG=1 node validate-pdf.js samples

# Check veraPDF detailed output
verapdf file.pdf --format text --verbose
```

## Contributing

When adding new validation checks:

1. Update the `extractPechoRequirements()` function in `validate-pdf.js`
2. Add failure code explanations to `analyze-pdf-failures.js`
3. Update this README with new requirements
4. Test with sample files

## License

These scripts are part of the art subscription platform project and follow the same license terms.
