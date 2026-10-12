'use strict';

const MARKER = '/* openyida-paired-css */';

// Paired CSS is authored source. Historical templates also used the generator's
// navigation markers for image rails, tab containers and other authored rules.
// Move that block out of generator ownership once; subsequent token deltas only
// replace the newly generated navigation-shape block.
function preservePairedRules(css) {
  if (css.includes(MARKER)) {return css;}
  return css.replaceAll('/* openyida-navigation-shape:start */', '/* openyida-template-navigation:start */')
    .replaceAll('/* openyida-navigation-shape:end */', '/* openyida-template-navigation:end */')
    .trimEnd() + `\n\n${MARKER}\n`;
}

module.exports = { preservePairedRules };
