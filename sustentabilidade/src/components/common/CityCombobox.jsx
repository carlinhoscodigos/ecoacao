import { useState, useRef, useEffect } from 'react';
import { buscarCidade } from '../../data/rsCities';
import styles from './CityCombobox.module.css';

/**
 * CityCombobox
 * Props:
 *   value        {objeto city ou null}
 *   onChange     (city | null) => void
 *   error        string
 *   disabled     bool
 */
export default function CityCombobox({ value, onChange, error, disabled }) {
  const [query, setQuery]       = useState(value?.nome || '');
  const [results, setResults]   = useState([]);
  const [open, setOpen]         = useState(false);
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | loading | error
  const inputRef  = useRef(null);
  const listRef   = useRef(null);
  const [activeIdx, setActiveIdx] = useState(-1);

  // Sincroniza se o valor externo mudar (ex: geolocalização)
  useEffect(() => {
    if (value?.nome && value.nome !== query) {
      setQuery(value.nome);
      setResults([]);
      setOpen(false);
    }
    if (!value) {
      setQuery('');
    }
  }, [value]);

  function handleInput(e) {
    const q = e.target.value;
    setQuery(q);
    onChange(null); // limpa seleção ao digitar

    if (q.length >= 2) {
      const found = buscarCidade(q);
      setResults(found);
      setOpen(found.length > 0);
    } else {
      setResults([]);
      setOpen(false);
    }
    setActiveIdx(-1);
  }

  function handleSelect(city) {
    setQuery(city.nome);
    onChange(city);
    setOpen(false);
    setResults([]);
    setActiveIdx(-1);
  }

  function handleKeyDown(e) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(results[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        inputRef.current && !inputRef.current.contains(e.target) &&
        listRef.current  && !listRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Rola o item ativo para a view
  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const item = listRef.current.children[activeIdx];
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIdx]);

  // ─── Geolocalização ────────────────────────────────────────────────────────
  async function handleGeolocate() {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      return;
    }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pt-BR`,
            { headers: { 'Accept-Language': 'pt-BR' } }
          );
          const data = await res.json();
          const cityName =
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.village ||
            data?.address?.municipality ||
            '';

          const { encontrarCidade, buscarCidade } = await import('../../data/rsCities');
          const exact = encontrarCidade(cityName);
          if (exact) {
            handleSelect(exact);
          } else {
            // Tenta correspondência parcial
            const partial = buscarCidade(cityName);
            if (partial.length > 0) {
              handleSelect(partial[0]);
            } else {
              // Preenche o campo com o nome retornado para seleção manual
              setQuery(cityName);
              setResults(buscarCidade(cityName));
              setOpen(true);
            }
          }
          setGeoStatus('idle');
        } catch {
          setGeoStatus('error');
        }
      },
      () => setGeoStatus('error'),
      { timeout: 8000 }
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputRow}>
        <input
          ref={inputRef}
          className={[styles.input, error ? styles.inputError : '', value ? styles.inputSelected : ''].join(' ')}
          type="text"
          placeholder="Digite para buscar a cidade…"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          autoComplete="off"
          disabled={disabled}
        />
        <button
          type="button"
          className={[styles.geoBtn, geoStatus === 'loading' ? styles.geoBtnLoading : ''].join(' ')}
          onClick={handleGeolocate}
          disabled={disabled || geoStatus === 'loading'}
          title="Usar minha localização"
        >
          {geoStatus === 'loading' ? '⏳' : '📍'}
        </button>
      </div>

      {geoStatus === 'error' && (
        <span className={styles.geoError}>
          Não foi possível obter a localização. Selecione manualmente.
        </span>
      )}

      {value && (
        <div className={styles.selected}>
          ✅ {value.nome} — RS
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => { onChange(null); setQuery(''); }}
          >×</button>
        </div>
      )}

      {open && results.length > 0 && (
        <ul ref={listRef} className={styles.dropdown} role="listbox">
          {results.map((city, i) => (
            <li
              key={city.codigoIbge + city.nome}
              className={[styles.option, i === activeIdx ? styles.optionActive : ''].join(' ')}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={() => handleSelect(city)}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <span className={styles.optionNome}>{city.nome}</span>
              <span className={styles.optionEstado}>RS</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
