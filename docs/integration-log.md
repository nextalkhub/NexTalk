# Integration log — NexTalk chat redesign

## Этап 0 — Подготовка

- Сделано:
  - `variables.scss` — добавлены токены из `chat.css :root` без замены существующих:
    - поверхности `$bg-0` … `$bg-5`, `$bg-overlay`
    - границы `$bd-1` … `$bd-3`
    - текст `$fg-0` … `$fg-4`
    - бренд `$brand-1/2/3`, `$grad-brand`, `$grad-brand-soft`
    - статусы `$ok`, `$warn`, `$live`, `$info`, `$mention`
    - радиусы `$r-sm` … `$r-2xl`, `$r-pill`
    - шрифты `$font-display`, `$font-body`, `$font-mono`
    - layout-размеры `$rail-w`, `$side-w`, `$right-w`, `$topbar-h`
  - `global.scss` — добавлен блок `:root` с CSS custom properties для всех новых токенов; `body` переведён на `$font-body` (Manrope) и `$bg-0`
  - `index.html` — подключены Space Grotesk, Manrope, JetBrains Mono через Google Fonts (рядом с Roboto)
  - `mixins.scss` — обновлён `@mixin scrollbar` (стиль прототипа); добавлены `@mixin chip`, `@mixin dot`, `@mixin avatar`, `@mixin icon-btn`
  - `npm run build` — зелёный ✓

- Что осталось как TODO: —

- Риски / вопросы: чанк 850 kB — существующее предупреждение, не относится к изменениям этапа
