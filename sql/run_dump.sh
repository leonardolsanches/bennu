#!/bin/bash
# ============================================================
# Bennu Finance - Database Dump Runner with Logging
# Usage: ./run_dump.sh <connection_string> [sql_file]
# Example: ./run_dump.sh "postgresql://user:pass@host:5432/dbname"
# ============================================================

SQL_FILE="${2:-bennu_finance_full_dump.sql}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="dump_output_${TIMESTAMP}.log"

echo "============================================================" | tee "$LOG_FILE"
echo " Bennu Finance - Database Dump Execution Log" | tee -a "$LOG_FILE"
echo " Date: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo " SQL File: $SQL_FILE" | tee -a "$LOG_FILE"
echo " Log File: $LOG_FILE" | tee -a "$LOG_FILE"
echo "============================================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

if [ -z "$1" ]; then
    echo "ERROR: Connection string required." | tee -a "$LOG_FILE"
    echo "Usage: ./run_dump.sh \"postgresql://user:pass@host:5432/dbname\" [sql_file]" | tee -a "$LOG_FILE"
    exit 1
fi

if [ ! -f "$SQL_FILE" ]; then
    echo "ERROR: SQL file '$SQL_FILE' not found." | tee -a "$LOG_FILE"
    exit 1
fi

CONN_STRING="$1"

echo "[INFO] Starting execution..." | tee -a "$LOG_FILE"
echo "[INFO] SQL file size: $(wc -c < "$SQL_FILE") bytes, $(wc -l < "$SQL_FILE") lines" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

START_TIME=$(date +%s)

psql "$CONN_STRING" \
    -v ON_ERROR_STOP=0 \
    -f "$SQL_FILE" \
    >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo "" | tee -a "$LOG_FILE"
echo "============================================================" | tee -a "$LOG_FILE"
echo " EXECUTION SUMMARY" | tee -a "$LOG_FILE"
echo "============================================================" | tee -a "$LOG_FILE"
echo "[INFO] Exit code: $EXIT_CODE" | tee -a "$LOG_FILE"
echo "[INFO] Duration: ${ELAPSED}s" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Count results from log
ERRORS=$(grep -ci "ERROR" "$LOG_FILE" 2>/dev/null || echo 0)
WARNINGS=$(grep -ci "WARNING" "$LOG_FILE" 2>/dev/null || echo 0)
NOTICES=$(grep -ci "NOTICE" "$LOG_FILE" 2>/dev/null || echo 0)
INSERTS=$(grep -ci "INSERT" "$LOG_FILE" 2>/dev/null || echo 0)
CREATES=$(grep -ci "CREATE" "$LOG_FILE" 2>/dev/null || echo 0)
DROPS=$(grep -ci "DROP" "$LOG_FILE" 2>/dev/null || echo 0)

echo "[STATS] Errors:   $ERRORS" | tee -a "$LOG_FILE"
echo "[STATS] Warnings: $WARNINGS" | tee -a "$LOG_FILE"
echo "[STATS] Notices:  $NOTICES" | tee -a "$LOG_FILE"
echo "[STATS] Creates:  $CREATES" | tee -a "$LOG_FILE"
echo "[STATS] Drops:    $DROPS" | tee -a "$LOG_FILE"
echo "[STATS] Inserts:  $INSERTS" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

if [ "$ERRORS" -gt 0 ]; then
    echo "============================================================" | tee -a "$LOG_FILE"
    echo " ERRORS FOUND:" | tee -a "$LOG_FILE"
    echo "============================================================" | tee -a "$LOG_FILE"
    grep -i "ERROR" "$LOG_FILE" | grep -v "STATS\|ON_ERROR" | tee -a "${LOG_FILE}.errors"
    echo "" | tee -a "$LOG_FILE"
    echo "[INFO] Error details saved to: ${LOG_FILE}.errors" | tee -a "$LOG_FILE"
fi

if [ "$WARNINGS" -gt 0 ]; then
    echo "============================================================" | tee -a "$LOG_FILE"
    echo " WARNINGS:" | tee -a "$LOG_FILE"
    echo "============================================================" | tee -a "$LOG_FILE"
    grep -i "WARNING" "$LOG_FILE" | head -20 | tee -a "${LOG_FILE}.warnings"
    echo "" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "[INFO] Full log saved to: $LOG_FILE" | tee -a "$LOG_FILE"
echo "[INFO] Execution completed at $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
