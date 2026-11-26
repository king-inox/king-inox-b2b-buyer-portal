import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { SUPPORT_LANGUAGE } from '@/constants';

import 'dayjs/locale/ar';
import 'dayjs/locale/cs';
import 'dayjs/locale/da';
import 'dayjs/locale/de';
import 'dayjs/locale/el';
import 'dayjs/locale/en';
import 'dayjs/locale/es';
import 'dayjs/locale/fi';
import 'dayjs/locale/fr';
import 'dayjs/locale/hr';
import 'dayjs/locale/hu';
import 'dayjs/locale/it';
import 'dayjs/locale/nl';
import 'dayjs/locale/pl';
import 'dayjs/locale/pt';
import 'dayjs/locale/ro';
import 'dayjs/locale/ru';
import 'dayjs/locale/sl';
import 'dayjs/locale/sq';
import 'dayjs/locale/sv';
import 'dayjs/locale/tr';
import 'dayjs/locale/uk';
import 'dayjs/locale/zh';

dayjs.extend(localizedFormat);

const setDayjsLocale = (localeKey: string) => {
  const locale = localeKey || 'en';
  dayjs.locale(locale);

  const activeLang = SUPPORT_LANGUAGE.find((item) => locale.includes(item)) || 'en';

  return activeLang;
};

export const getDayjsLocale = () => {
  const locale = dayjs.locale();
  return SUPPORT_LANGUAGE.find((item) => locale.includes(item)) || 'en';
};

export default setDayjsLocale;
