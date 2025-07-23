@echo off
SETLOCAL EnableDelayedExpansion

:: Pre-push validation script for GhostCDN
:: This script checks both frontend and backend code for issues
:: before pushing to GitHub to minimize risk of failed builds on Vercel

set PAUSE_AT_END=1
if "%1"=="--no-pause" set PAUSE_AT_END=0

echo 🔍 Running pre-push checks for GhostCDN...

:: Check if pnpm exists
where pnpm >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo [31m✗[0m pnpm is not installed. Please install it first.
  if %PAUSE_AT_END%==1 pause
  exit /b 1
)

:: Frontend Checks
echo.
echo [33m==^>[0m Checking frontend...

cd frontend

:: Check for package.json
if not exist "package.json" (
  echo [31m✗[0m package.json not found in frontend directory!
  if %PAUSE_AT_END%==1 pause
  exit /b 1
)

:: Install dependencies if node_modules doesn't exist
if not exist "node_modules\" (
  echo.
  echo [33m==^>[0m Installing frontend dependencies...
  call pnpm install
  if %ERRORLEVEL% neq 0 (
    echo [31m✗[0m Failed to install frontend dependencies
    if %PAUSE_AT_END%==1 pause
    exit /b 1
  )
)

:: Lint check
echo.
echo [33m==^>[0m Running frontend lint check...
call pnpm lint
if %ERRORLEVEL% neq 0 (
  echo [31m✗[0m Frontend linting failed
  if %PAUSE_AT_END%==1 pause
  exit /b 1
)

:: Type check
echo.
echo [33m==^>[0m Running frontend type check...
call pnpm run typecheck
if %ERRORLEVEL% neq 0 (
  echo [31m✗[0m Frontend type check failed
  if %PAUSE_AT_END%==1 pause
  exit /b 1
)

:: Build check
echo.
echo [33m==^>[0m Running frontend build check...
call pnpm run build
if %ERRORLEVEL% neq 0 (
  echo [31m✗[0m Frontend build failed
  if %PAUSE_AT_END%==1 pause
  exit /b 1
)

echo [32m✓[0m Frontend checks passed!

:: Backend Checks
echo.
echo [33m==^>[0m Checking backend...

cd ../backend

:: Check for package.json
if not exist "package.json" (
  echo [31m✗[0m package.json not found in backend directory!
  if %PAUSE_AT_END%==1 pause
  exit /b 1
)

:: Install dependencies if node_modules doesn't exist
if not exist "node_modules\" (
  echo.
  echo [33m==^>[0m Installing backend dependencies...
  call pnpm install
  if %ERRORLEVEL% neq 0 (
    echo [31m✗[0m Failed to install backend dependencies
    if %PAUSE_AT_END%==1 pause
    exit /b 1
  )
)

:: Check if TypeScript is configured
if exist "tsconfig.json" (
  echo.
  echo [33m==^>[0m Running backend TypeScript check...
  call pnpm run typecheck
  if %ERRORLEVEL% neq 0 (
    echo [31m✗[0m Backend TypeScript check failed
    if %PAUSE_AT_END%==1 pause
    exit /b 1
  )
)

:: Run backend tests if available
findstr /C:"\"test\":" package.json >nul
if %ERRORLEVEL% equ 0 (
  echo.
  echo [33m==^>[0m Running backend tests...
  call pnpm test
  if %ERRORLEVEL% neq 0 (
    echo [31m✗[0m Backend tests failed
    if %PAUSE_AT_END%==1 pause
    exit /b 1
  )
)

:: Check for common backend issues
echo.
echo [33m==^>[0m Checking for environment variables...
if not exist ".env" (
  if not exist ".env.example" (
    echo [33mWarning:[0m No .env or .env.example file found in backend directory
  )
)

:: Prisma schema validation if applicable
if exist "prisma\schema.prisma" (
  echo.
  echo [33m==^>[0m Validating Prisma schema...
  call npx prisma validate
  if %ERRORLEVEL% neq 0 (
    echo [31m✗[0m Prisma schema validation failed
    if %PAUSE_AT_END%==1 pause
    exit /b 1
  )
)

echo [32m✓[0m Backend checks passed!

:: Overall status
echo.
echo [32m====================[0m
echo [32m✓ All checks passed! Ready to push.[0m
echo [32m====================[0m

cd ..

if %PAUSE_AT_END%==1 pause
exit /b 0 