import { createIntl } from 'react-intl';

import locales from './index';

const intl = createIntl({ locale: 'en', messages: {} });
const parse = (message: string) => intl.formatters.getMessageFormat(message, 'en').getAst();

const signature = (message: string): string[] => {
  const result: string[] = [];
  const visit = (nodes: ReturnType<typeof parse>) => {
    nodes.forEach((node) => {
      if ('value' in node && node.type !== 0) result.push(node.value);
      if ('options' in node) {
        Object.values(node.options).forEach((option) => {
          visit(option.value);
        });
      }
      if ('children' in node) visit(node.children);
    });
  };
  visit(parse(message));
  return [...new Set(result)].sort();
};

it.each(Object.entries(locales))(
  '%s covers every portal message and preserves ICU arguments',
  (_code, messages) => {
    expect(Object.keys(messages).sort()).toEqual(Object.keys(locales.en).sort());
    Object.entries(locales.en).forEach(([key, message]) => {
      const translated = (messages as Record<string, string>)[key];
      expect(translated.trim(), key).not.toBe('');
      expect(signature(translated), key).toEqual(signature(message));
    });
  },
);
