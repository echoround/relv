# Relvaeksami küsimustike tööversioonid

Selles kaustas olevad küsimustikud on enne avaldamist ülevaatamiseks. Veebilehe aktiivne küsimustik jääb praegu muutmata ja asub failis [`../questions.json`](../questions.json).

Kõige mugavam on komplekte vaadata lehel [`compare.html`](compare.html), kus algne ja asendusküsimus on kõrvuti ning täiesti uued küsimused eraldi vahekaardil.

## Komplektid

| Komplekt | Fail | Eesmärk |
| --- | --- | --- |
| Praegused algküsimused | [`../questions.json`](../questions.json) | Muutmata võrdlusmaterjal. Need on küsimused, mida veebileht praegu kasutab. |
| Iseseisvalt ümber kirjutatud asendus | [`current-rewritten.json`](current-rewritten.json) | 71 uut küsimust, millest igaüks on seotud vana küsimusega välja `legacyId` kaudu. Vastused ja selgitused on kontrollitud kehtivate allikate järgi. |
| Täiesti uued küsimused | [`new-original.json`](new-original.json) | Eraldi lisakomplekt teemadest, mis vanas pangas puuduvad või on liiga nõrgalt kaetud. |

`legacyId` võimaldab võrrelda asendusküsimust algküsimusega, ilma et kopeeritud algteksti teist korda repositooriumisse lisataks. Mõne vana küsimuse õige vastus oli aegunud või ekslik; sellisel juhul säilitab asendusküsimus teema, mitte vana vale vastuse.

## Allikad ja kehtivus

Küsimused on üle vaadatud 7. septembril 2026 järgmiste ametlike allikate järgi:

- [Relvaseaduse kontrollimisel kasutatud kehtiv redaktsioon](https://www.riigiteataja.ee/akt/112122024004)
- [Relvaeksami nõuded ja läbiviimise kord](https://www.riigiteataja.ee/akt/124032023006)
- [Nõuded relvahoidlale, relvakapile ning püssirohu ja sütiku hoidmisele](https://www.riigiteataja.ee/akt/120052020027)
- [Karistusseadustiku kontrollimisel kasutatud kehtiv redaktsioon](https://www.riigiteataja.ee/akt/122122025002)
- [Terviseameti esmaabijuhised](https://www.terviseamet.ee/tervishoiukorraldus/esmaabi)
- [European Resuscitation Council Guidelines 2025: First Aid](https://www.erc.edu/media/i2vllpae/gl2025-12-faid-e.pdf)
- [Häirekeskuse 112 juhend](https://www.112.ee/et/juhend/hadaabinumber-112)

Relvaseaduse järgmine redaktsioon jõustub 30. septembril 2026. Seetõttu tuleb mõlemad uued komplektid hiljemalt 29. septembril 2026 uuesti üle kontrollida. Küsimused ei ole Politsei- ja Piirivalveameti ametlik eksamipank ega asenda praktilist relva- või esmaabikoolitust.

## Vorming

- `correct` sisaldab õigete vastusevariantide nullist algavaid järjekorranumbreid.
- `multiple` on `true`, kui õigeid vastuseid on mitu.
- `references` viitab küsimuse koostamisel kasutatud sätetele või juhistele.
- `status: review` tähendab, et komplekti ei laadita veel veebilehe aktiivsesse testi.

Kontrollimiseks käivita repositooriumi juurkaustas:

```powershell
node scripts/validate-question-sets.cjs
```
