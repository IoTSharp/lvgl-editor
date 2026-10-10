import { LANGS, setLang, useLang } from '../../i18n';

export default function LanguageSwitcher() {
  const language = useLang();
  return <select aria-label="Language" value={language} onChange={event => {
    const choice = LANGS.find(item => item.id === event.target.value);
    if (choice) setLang(choice.id);
  }}>
    {LANGS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
  </select>;
}
