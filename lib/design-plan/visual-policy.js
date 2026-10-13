'use strict';

function getVisualDecisionPolicy(selectedTheme) {
  return {
    reference: 'yida-skills/skills/yida-design/references/theme-selection.md#设计方向比较',
    preserve: 'explicit_user_direction_brand_and_existing_app_theme',
    responsiveLayout: {
      reference: 'yida-skills/skills/yida-design/references/responsive-layout.md',
      authoring: 'Use existing per-page layout, responsive and acceptance fields in design.md; no additional authoring schema.',
      policy: 'Design for actual container width, including drawers and expanded platform navigation. Align same-row controls, wrap filters and actions, stack main/secondary panels when space is insufficient, and release desktop equal heights in a single column. Keep wide-table scrolling local. Verify breakpoint edges, long content, empty/loading/error states and keyboard access without changing business behavior or losing state.',
    },
    applicationStyle: {
      cssSource: 'Preserve themeProfile.sourceThemeId in final design.md. Named themes start from paired app_theme.css; free-creative uses the shared skeleton. Keep all original template files, CSS declarations, rule order and project customizations. Instantiate brand placeholders and explicit project deltas only; do not append generic navigation rules or color-group. Missing local variables may be provided by the platform; report conflicts and obtain confirmation before changing template sources. Generate to a new path when switching themes, then review custom rules before migration. Verify computed styles against both the original template and approved design.',
      navigationCompatibility: {
        reference: 'yida-skills/skills/yida-design/references/navigation-decision.md#主题与导航兼容规则',
        source: 'design-plan catalog themes[].supportedNavigationLayouts',
        policy: 'Filter themes by the existing or explicitly selected navigation layout. If only a theme is selected for a new app, use its supported layout. If both explicit choices conflict, resolve through the existing plan confirmation. Do not silently change navigation or template constraints. Side excludes L-shaped/mixed navigation; custom menus use their actual variant. Responsive collapse preserves the same navigation ownership, entries and order.',
      },
      scope: ['navigation', 'application_shell', 'native_form', 'custom_page', 'record_detail'],
      navigationTokens: 'tokens.application-global.appearance.navigation',
      navigationRoles: ['surface', 'text', 'hover', 'selected', 'disabled', 'logo', 'group', 'search', 'popup', 'action', 'border', 'radius', 'shadow', 'density'],
      navigationShape: {
        reference: 'yida-skills/skills/yida-design/references/application-theme-consistency.md#导航形状与密度的案例经验',
        inputs: ['radius', 'normal_hover_selected_borders', 'selected_shadow', 'item_height', 'padding', 'gap', 'shell_spacing'],
        authoring: { fast: 'design.md tokens.application-global.appearance.navigation', plan: 'visualStyle.tokens' },
        layout: 'preserve_business_navigation_type_independently_of_theme_appearance',
        verification: ['native_data_management', 'custom_page', 'submission', 'record_detail', 'long_labels', 'collapsed_navigation'],
      },
      delivery: 'one_design_document_and_application_theme_css',
      verification: 'read_back_app_settings_and_verify_rendered_navigation_form_custom_page_and_detail',
    },
    nativeFormLayout: {
      model: 'component_based_native_form_layout',
      regions: ['top', 'left', 'main', 'right', 'between_fields'],
      components: ['tabs', 'button_groups', 'images', 'graphics', 'status_blocks', 'dividers', 'columns', 'fields'],
      roles: ['navigation', 'action', 'visual_focus', 'feedback', 'hierarchy', 'rhythm', 'decoration', 'data_capture'],
      rules: ['place_components_by_role', 'preserve_existing_component_tree', 'use_divider_for_business_groups'],
      forbidden: ['generic_filler_copy', 'random_layout_rotation'],
    },
    creativeOption: { alwaysAvailable: true, themeId: 'free-creative', selectionRequired: false,
      source: 'independent_business_reasoning_not_preset_matching',
      authoringReference: 'yida-skills/skills/yida-design/references/application-style-library.md' },
    comparison: { candidateCount: 3, baseline: 'first_instinct', alternatives: 2, distinctDimensions: 2,
      dimensions: ['composition', 'typography', 'surface_hierarchy', 'color_relationships', 'navigation_shape_and_density'] },
    selection: 'refine_and_choose_a_supported_alternative_within_business_constraints',
    quality: ['task_efficiency', 'readability_and_contrast', 'consistent_spacing_and_alignment', 'coherent_visual_identity'],
    execution: 'one_shared_three_direction_generation_pass_for_fast_and_plan',
    handoff: ['visualSelection.visualDirection.description', 'visualSelection.colorStrategy.usage'],
    presentation: 'fast_selects_internally; plan_asks_user_when_no_explicit_visual_direction',
    themeSelection: {
      reference: 'yida-skills/skills/yida-design/references/theme-selection.md#选择时展示名称与效果图',
      qwenwork: {
        activeToolId: 'qwenwork',
        tool: 'qoder_show_widget',
        prepareCommand: 'openyida sample yida-design theme-selector --json',
        widgetPathSource: 'prepareCommand result.widget_path; relative to the host skills root, never an absolute path',
        data: '{themes: [{id, name, img?, desc, tags, selected}]}',
        response: 'natural_language_with_themeId',
        interactionOrder: {
          reference: 'yida-skills/skills/yida-design/references/theme-selection.md#千问交互顺序',
          sequence: ['resolve_required_ask_human', 'reuse_or_select_style', 'confirm_plan_if_required'],
          maxPendingInteractions: 1,
          policy: 'Wait for actual answers to necessary scope and mode questions before opening the widget; tool return or timeout is not an answer. Do not add ask_human just to satisfy ordering. Reuse explicit style choices, including those in earlier answers. While awaiting the widget, do not open ask_human or another selector. After a confirmed widget failure, retire that interaction before a single fallback; an unanswered widget is not a failure. Save the choice before any later plan confirmation. Ignore retired callbacks.',
        },
      },
      otherHosts: 'ask_human',
      reuse: {
        reference: 'yida-skills/skills/yida-design/references/theme-selection.md#已选风格只确认一次',
        checkBeforePresentation: ['current_user_reply', 'brief.visualSelection', 'visualStyle.internal.selectedTheme', 'design.md themeProfile.sourceThemeId'],
        policy: 'Apply currentSelection before generic comparison or presentation guidance. A valid explicit theme choice, including free-creative or accepting the recommendation, completes style selection. Persist themeId and source immediately, reuse across workflow stages and tool fallback, and fill missing design details without reopening the chooser. First-instinct comparison runs only before an initial choice. Duplicate callbacks are idempotent. A later user request to change style supersedes earlier replies. Reopen only for an explicit style change or a verified incompatibility that requires a user decision; ask only about that conflict. Final build-plan approval does not reopen style selection.',
      },
      ...(selectedTheme?.themeId ? {
        currentSelection: { themeId: selectedTheme.themeId, source: selectedTheme.source, action: 'reuse', askStyleAgain: false, compareFirstInstinct: false },
      } : {}),
      policy: 'Present only eligible candidates; omit missing images. Wait for explicit user selection, validate the returned themeId against the presented candidates, then restore the selected visual direction. Preselection is not confirmation. Keep the subsequent build-plan confirmation unchanged.',
    },
  };
}

module.exports = { getVisualDecisionPolicy };
