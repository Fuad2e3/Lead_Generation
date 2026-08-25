@echo off
title Starting ProspectInsight Servers...
echo ====================================================
echo   Starting API Server (Port 3000) & Scraper (Port 4000)
echo ====================================================

cd dev
pm2 start ecosystem.js
pm2 status

echo ====================================================
echo   Both servers are ONLINE and running with PM2!
echo ====================================================
pause
