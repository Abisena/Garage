/**
 * Cache Buster Utility
 * Version: 2.5.0-SIKK-PRODUCTION
 * 
 * This file forces the build system to regenerate all modules
 * by changing its timestamp/content.
 * 
 * CHANGELOG v2.5.0:
 * ✅ PRODUCTION READY - SIKK Document
 * - Layout: A5 Landscape (210mm x 148mm)
 * - Print margin: 8mm all sides
 * - Clean professional design, no debug elements
 * - 2-column grid layout (compact & efficient)
 * - All data properly displayed:
 *   • Plate number (prominent display)
 *   • Vehicle info (brand, model, year, color)
 *   • Owner info (name, phone)
 *   • Security checklist (4 items)
 *   • Signature boxes (Petugas Workshop & Security)
 *   • Warning section
 *   • Company email footer
 * - Fixed CSS rendering issue with simplified modal structure
 * - Print CSS optimized for A5 landscape output
 * - Modal UI: gradient header, scrollable content, action buttons
 */

export const APP_VERSION = '2.5.0-SIKK-PRODUCTION';
export const BUILD_TIMESTAMP = '2024-11-15T18:00:00Z';
export const CACHE_BUSTER_ID = 'cb-20241115-180000-SIKK-PRODUCTION';

// Force module reload by exporting a unique value each time
export const FORCE_RELOAD = `rebuild-${Date.now()}-${Math.random().toString(36).substring(7)}-SIKK-PRODUCTION`;

// Additional cache breaker - changes on every file read
export const MODULE_INVALIDATOR = `module-invalidator-${Date.now()}-${Math.random()}`;
export const BUILD_HASH = `hash-${Date.now().toString(36)}`;

// Check for html2canvas in global scope
export function checkForHtml2Canvas() {
  if (typeof window !== 'undefined') {
    const hasHtml2Canvas = !!(window as any).html2canvas;
    
    if (hasHtml2Canvas) {
      console.error('⚠️ CRITICAL: html2canvas detected in window object!');
      console.error('This should NOT happen. Deleting...');
      delete (window as any).html2canvas;
      
      // Also check for jsPDF
      if ((window as any).jspdf || (window as any).jsPDF) {
        console.error('⚠️ CRITICAL: jsPDF detected in window object!');
        delete (window as any).jspdf;
        delete (window as any).jsPDF;
      }
      
      return true;
    }
    
    console.log('✅ html2canvas NOT found (correct)');
    return false;
  }
  
  return false;
}

// Clear all caches
export async function clearAllCaches() {
  console.log('🧹 Clearing all caches...');
  
  // Clear localStorage (only harmless app version info retained)
  localStorage.clear();
  localStorage.setItem('app-version', APP_VERSION);

  // Clear sessionStorage but preserve current session user snapshot
  const savedUser = sessionStorage.getItem('currentUser');
  sessionStorage.clear();
  if (savedUser) {
    sessionStorage.setItem('currentUser', savedUser);
  }
  
  // Unregister service workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('🧹 Service worker unregistered');
    }
  }
  
  // Clear cache storage
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      await caches.delete(cacheName);
      console.log('🧹 Cache deleted:', cacheName);
    }
  }
  
  console.log('✅ All caches cleared');
}

// Log system info
export function logSystemInfo() {
  console.log('══════════════════════════════════════');
  console.log('🚀 IMOGI Workshop Management System');
  console.log('══════════════════════════════════════');
  console.log('Version:', APP_VERSION);
  console.log('Build Time:', BUILD_TIMESTAMP);
  console.log('Cache Buster:', CACHE_BUSTER_ID);
  console.log('Force Reload:', FORCE_RELOAD);
  console.log('───────────────────────────────────────');
  
  // Show localStorage version
  const storedVersion = localStorage.getItem('app-version');
  console.log('Stored Version:', storedVersion || 'none');
  console.log('Current Version:', APP_VERSION);
  if (storedVersion === APP_VERSION) {
    console.log('✅ Version match!');
  } else {
    console.log('🔄 Version will be updated...');
  }
  console.log('──────────────────────────────────────');
  
  console.log('User Agent:', navigator.userAgent);
  console.log('Platform:', navigator.platform);
  console.log('Language:', navigator.language);
  console.log('Online:', navigator.onLine);
  console.log('──────────────────────────────────────');
  
  // Check for problematic libraries
  const problematicLibs = [
    'html2canvas',
    'jspdf',
    'jsPDF',
    'html2pdf'
  ];
  
  let foundProblematic = false;
  problematicLibs.forEach(lib => {
    if ((window as any)[lib]) {
      console.error(`❌ Found: ${lib} (should not exist!)`);
      foundProblematic = true;
    }
  });
  
  if (!foundProblematic) {
    console.log('✅ No problematic libraries detected');
  }
  
  console.log('═══════════════════════════════════════\n');
}