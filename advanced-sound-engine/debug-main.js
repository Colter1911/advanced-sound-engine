console.log("ADVANCED SOUND ENGINE: DEBUG ISOLATION TEST LOADED!");
window.ASE_DEBUG_LOADED = true;

Hooks.once('init', () => {
    console.log("ADVANCED SOUND ENGINE: DEBUG ISOLATION INIT FIRED!");
    window.ASE_DEBUG_INIT = true;
});
