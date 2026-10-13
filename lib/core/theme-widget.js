'use strict';

const fs = require('fs');
const path = require('path');
const { buildSkillsDiagnostics } = require('./utils');
const { CliError } = require('./cli-error');
const { t } = require('./i18n');

const TEMPLATE_SOURCE = path.resolve(__dirname, '../../yida-skills/skills/yida-design/templates/theme-selector.html');
const TEMPLATE_IN_PACKAGE = path.join('skills', 'yida-design', 'templates', 'theme-selector.html');

function canonicalPath(target) {
  if (fs.lstatSync(target, { throwIfNoEntry: false })) {return fs.realpathSync(target);}
  return path.join(canonicalPath(path.dirname(target)), path.basename(target));
}

function fail(code, details) {
  throw new CliError(t('cli_argument.invalid', `theme-selector: ${code}`), { code, details });
}

// Resolve the same host skills roots as copy -skills, but prepare only the widget.
// A writable generic workspace fallback is not necessarily searched by the widget tool.
function prepareThemeSelector(options = {}) {
  const diagnostics = buildSkillsDiagnostics(options);
  const subtype = diagnostics.active_tool?.subtype;
  const allowedReasons = subtype === 'qwenwork_desktop'
    ? ['qwenwork_desktop_user_skills_dir']
    : subtype === 'qwenwork_web'
      ? ['qwenwork_web_configured_skills_path', 'qwenwork_web_workspace_market_skills'] : [];
  if (diagnostics.active_tool?.tool !== 'qwenwork' || !allowedReasons.length) {
    fail('THEME_WIDGET_QWENWORK_REQUIRED', { activeTool: diagnostics.active_tool });
  }
  const target = diagnostics.candidates.find(candidate => candidate.usable && allowedReasons.includes(candidate.reason));
  if (!target || diagnostics.diagnostics.config_content_error) {
    fail('THEME_WIDGET_SKILLS_ROOT_UNAVAILABLE', { configError: diagnostics.diagnostics.config_content_error });
  }
  const skillsRoot = path.dirname(target.path);
  const outputPath = path.join(target.path, TEMPLATE_IN_PACKAGE);
  const source = fs.readFileSync(TEMPLATE_SOURCE);
  const existing = fs.existsSync(outputPath);
  const resolvedOutput = canonicalPath(outputPath);
  const linkedToSource = existing && resolvedOutput === fs.realpathSync(TEMPLATE_SOURCE);
  const relative = path.relative(canonicalPath(skillsRoot), resolvedOutput);
  if (!linkedToSource && (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))) {
    fail('THEME_WIDGET_PATH_OUTSIDE_SKILLS', { outputPath });
  }
  // Existing linked installs can be used directly; never write back into package sources.
  if (!existing || !fs.readFileSync(outputPath).equals(source)) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, source);
  }
  if (!fs.readFileSync(outputPath).equals(source)) {
    fail('THEME_WIDGET_COPY_MISMATCH', { outputPath });
  }
  return {
    success: true,
    tool: 'qoder_show_widget',
    widget_path: path.relative(skillsRoot, outputPath).split(path.sep).join('/'),
    skillsRoot,
    outputPath,
  };
}

module.exports = { prepareThemeSelector };
