@echo off
echo Resolving conflicts in dist files...
cd advanced-sound-engine
git checkout --theirs dist/module.js
git checkout --theirs dist/module.js.map
git checkout --theirs dist/styles/sound-engine-v5.css
git add dist/styles/effects.css
echo Rebuilding project...
call npm run build
echo Staging changes...
git add .
echo Committing merge...
git commit -m "Merge claude/effects-chain-pattern-vNoAD with conflict resolution"
echo Done!
pause
