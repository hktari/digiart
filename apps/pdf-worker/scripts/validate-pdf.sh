#!/bin/bash

# PDF Validation Script using veraPDF
# Validates PDF files against Peecho printing requirements

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VALIDATION_DIR="$SCRIPT_DIR/../validation-results"
SAMPLES_DIR="$SCRIPT_DIR/../sample-booklets-do-not-commit"

# Create validation results directory
mkdir -p "$VALIDATION_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to validate a single PDF
validate_pdf() {
    local pdf_file=$1
    local output_dir=$2
    local filename=$(basename "$pdf_file" .pdf)
    
    print_status $BLUE "Validating: $pdf_file"
    
    # Create output directory for this PDF
    mkdir -p "$output_dir/$filename"
    
    # Run veraPDF validation
    verapdf "$pdf_file" \
        --format text \
        --output "$output_dir/$filename/validation-report.txt" \
        2>&1 | tee "$output_dir/$filename/validation-console.log"
    
    # Extract summary from validation report
    local validation_result=$(grep -A 5 "VALIDATION SUMMARY" "$output_dir/$filename/validation-report.txt" || echo "No summary found")
    
    # Check if PDF is compliant
    if echo "$validation_result" | grep -q "compliant"; then
        print_status $GREEN "✓ PASS: $filename is compliant"
        echo "PASS" > "$output_dir/$filename/status.txt"
    else
        print_status $RED "✗ FAIL: $filename is not compliant"
        echo "FAIL" > "$output_dir/$filename/status.txt"
    fi
    
    # Extract specific Peecho requirements
    extract_peecho_requirements "$output_dir/$filename"
    
    echo "---"
}

# Function to extract Peecho-specific requirements
extract_peecho_requirements() {
    local output_dir=$1
    
    print_status $YELLOW "Checking Peecho requirements..."
    
    # Check for PDF/X compliance ( veraPDF supports PDF/X-1a, PDF/X-3, PDF/X-4 )
    if grep -q "PDF/X" "$output_dir/validation-report.txt"; then
        print_status $GREEN "  ✓ PDF/X compliance found"
        echo "PDF/X: YES" >> "$output_dir/peecho-checklist.txt"
    else
        print_status $RED "  ✗ No PDF/X compliance detected"
        echo "PDF/X: NO" >> "$output_dir/peecho-checklist.txt"
    fi
    
    # Check for font embedding
    if grep -q "font" "$output_dir/validation-report.txt" | grep -q "embedded"; then
        print_status $GREEN "  ✓ Fonts are embedded"
        echo "Fonts embedded: YES" >> "$output_dir/peecho-checklist.txt"
    else
        print_status $YELLOW "  ⚠ Font embedding status unclear"
        echo "Fonts embedded: UNKNOWN" >> "$output_dir/peecho-checklist.txt"
    fi
    
    # Check for color profiles
    if grep -q -i "color\|profile\|cmyk\|rgb" "$output_dir/validation-report.txt"; then
        print_status $GREEN "  ✓ Color information found"
        echo "Color profile: YES" >> "$output_dir/peecho-checklist.txt"
    else
        print_status $YELLOW "  ⚠ Color profile information unclear"
        echo "Color profile: UNKNOWN" >> "$output_dir/peecho-checklist.txt"
    fi
    
    # Check page count (18-500 pages required by Peecho)
    local page_count=$(verapdf "$pdf_file" --format text 2>/dev/null | grep -i "pages\|page count" | head -1 | grep -o '[0-9]\+' || echo "0")
    if [ "$page_count" -ge 18 ] && [ "$page_count" -le 500 ]; then
        print_status $GREEN "  ✓ Page count ($page_count) within Peecho range (18-500)"
        echo "Page count: $page_count (VALID)" >> "$output_dir/peecho-checklist.txt"
    elif [ "$page_count" -gt 0 ]; then
        print_status $RED "  ✗ Page count ($page_count) outside Peecho range (18-500)"
        echo "Page count: $page_count (INVALID)" >> "$output_dir/peecho-checklist.txt"
    else
        print_status $YELLOW "  ⚠ Could not determine page count"
        echo "Page count: UNKNOWN" >> "$output_dir/peecho-checklist.txt"
    fi
}

# Function to validate all PDFs in a directory
validate_directory() {
    local input_dir=$1
    local output_dir=$2
    
    print_status $BLUE "Validating all PDFs in: $input_dir"
    
    if [ ! -d "$input_dir" ]; then
        print_status $RED "Error: Directory $input_dir does not exist"
        exit 1
    fi
    
    local pdf_count=0
    local pass_count=0
    
    # Find all PDF files in the directory
    while IFS= read -r -d '' pdf_file; do
        validate_pdf "$pdf_file" "$output_dir"
        pdf_count=$((pdf_count + 1))
        
        if [ "$(cat "$output_dir/$(basename "$pdf_file" .pdf)/status.txt")" = "PASS" ]; then
            pass_count=$((pass_count + 1))
        fi
    done < <(find "$input_dir" -name "*.pdf" -print0)
    
    # Generate summary report
    generate_summary "$output_dir" "$pdf_count" "$pass_count"
}

# Function to generate summary report
generate_summary() {
    local output_dir=$1
    local total_count=$2
    local pass_count=$3
    
    local summary_file="$output_dir/validation-summary.md"
    
    cat > "$summary_file" << EOF
# PDF Validation Summary

**Generated:** $(date)
**Total Files:** $total_count
**Passed:** $pass_count
**Failed:** $((total_count - pass_count))
**Success Rate:** $(( pass_count * 100 / total_count ))%

## Peecho Requirements Checklist

EOF
    
    # Add individual file results
    for status_file in "$output_dir"/*/status.txt; do
        if [ -f "$status_file" ]; then
            local dirname=$(dirname "$status_file")
            local filename=$(basename "$dirname")
            local status=$(cat "$status_file")
            
            echo "### $filename" >> "$summary_file"
            echo "**Status:** $status" >> "$summary_file"
            
            if [ -f "$dirname/peecho-checklist.txt" ]; then
                cat "$dirname/peecho-checklist.txt" | sed 's/^/- /' >> "$summary_file"
            fi
            
            echo "" >> "$summary_file"
        fi
    done
    
    print_status $BLUE "Summary report generated: $summary_file"
}

# Main script logic
main() {
    print_status $BLUE "PDF Validation Script for Peecho Requirements"
    print_status $BLUE "================================================"
    
    case "${1:-}" in
        "samples")
            validate_directory "$SAMPLES_DIR" "$VALIDATION_DIR/samples"
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  samples    Validate sample booklets in sample-booklets-do-not-commit/"
            echo "  help       Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 samples                    # Validate all sample PDFs"
            echo "  $0 /path/to/pdf/file.pdf      # Validate single PDF"
            echo "  $0 /path/to/pdf/directory     # Validate all PDFs in directory"
            ;;
        "")
            print_status $YELLOW "No argument provided. Validating sample booklets..."
            validate_directory "$SAMPLES_DIR" "$VALIDATION_DIR/samples"
            ;;
        *)
            if [ -f "$1" ]; then
                validate_pdf "$1" "$VALIDATION_DIR/single"
            elif [ -d "$1" ]; then
                validate_directory "$1" "$VALIDATION_DIR/custom"
            else
                print_status $RED "Error: $1 is not a valid file or directory"
                exit 1
            fi
            ;;
    esac
}

main "$@"
