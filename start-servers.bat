@echo off
title Starting ProspectInsight Servers...
echo ====================================================
echo   Starting API, Scraper, and Cloudflare Tunnel
echo ====================================================

cd dev
pm2 delete all 2>nul
pm2 start ecosystem.config.js
pm2 status

echo ====================================================
echo   All 3 services are ONLINE with PM2!
echo   To view the Cloudflare Tunnel link, run:
echo   pm2 logs cloudflare-tunnel
echo ====================================================
pause
