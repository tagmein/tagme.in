/**
 * Copy Realm Tabs as JavaScript
 * 
 * Run this script in the browser console on the source browser to copy the realm tab list.
 * Then paste the generated code in the destination browser console to restore the tabs.
 */

(function copyRealmTabs() {
  const sessions = JSON.parse(localStorage.getItem('tmi:sessions') || '[]');
  const activeSession = localStorage.getItem('tmi:active-session') || 'public';
  
  if (sessions.length === 0) {
    console.log('No realm tabs found to copy.');
    return;
  }
  
  const code = `// Paste this script in the destination browser console to restore realm tabs
(function restoreRealmTabs() {
  const sessions = ${JSON.stringify(sessions, null, 2)};
  const activeSession = '${activeSession}';
  
  // Save sessions to localStorage
  localStorage.setItem('tmi:sessions', JSON.stringify(sessions));
  localStorage.setItem('tmi:active-session', activeSession);
  
  console.log('Restored ' + sessions.length + ' realm tab(s).');
  console.log('Active session: ' + activeSession);
  console.log('Reload the page to see the restored tabs.');
})();`;

  // Copy to clipboard
  navigator.clipboard.writeText(code).then(() => {
    console.log('✅ Realm tabs copied to clipboard!');
    console.log('Sessions found: ' + sessions.length);
    console.log('Active session: ' + activeSession);
    console.log('\nPaste the copied code in the destination browser console.');
    console.log('\n--- Generated Code ---\n' + code);
  }).catch(err => {
    console.error('Failed to copy to clipboard:', err);
    console.log('\n--- Copy this code manually ---\n' + code);
  });
})();
