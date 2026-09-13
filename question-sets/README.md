# Relvaeksami küsimustiku lähtefailid

Veebilehe aktiivne test kasutab 71 iseseisvalt sõnastatud küsimust. Nende allikaviidetega lähtefail on [`current-rewritten.json`](current-rewritten.json) ja mugav ülevaade asub lehel [`compare.html`](compare.html).

Kõigi 71 varasema küsimuse põhiteema seos aktiivse komplektiga on kirjas failis [`coverage-audit.md`](coverage-audit.md). Aegunud vastusevõtmeid ei ole üle võetud.

Brauser laadib sama komplekti failist [`../questions.min.json`](../questions.min.json). Selgitused asuvad ka eraldi failis [`../explanations.min.json`](../explanations.min.json), et neid saaks laadida alles pärast vastamist. Mõlemad käitusfailid luuakse lähtefaili küsimustest ning valideerija kontrollib, et nende sisu ei läheks lahku.

## Komplektide olek

| Komplekt | Fail | Olek |
| --- | --- | --- |
| Aktiivne 71 küsimuse komplekt | [`current-rewritten.json`](current-rewritten.json) | Kasutusel. Küsimused, vastused, selgitused ja viited on 13. septembril 2026 kehtinud ametlike allikate järgi üle vaadatud. |
| Eraldi 30 küsimuse tööversioon | `new-original.json` | Tagasi lükatud. Seda ei laadita testi ega ülevaatelehele. |

Varasem küsimustik ei ole enam veebilehel aktiivne. See säilib vajaduse korral Git-ajaloos, kuid seda ei käsitleta vastuste ega õiguse allikana.

## Allikad ja kehtivus

- [Relvaseadus](https://www.riigiteataja.ee/akt/112122024004)
- [Relvaeksami nõuded ja läbiviimise kord](https://www.riigiteataja.ee/akt/124032023006)
- [Nõuded relvahoidlale, relvakapile ning püssirohu ja sütiku hoidmisele](https://www.riigiteataja.ee/akt/120052020027)
- [Karistusseadustik](https://www.riigiteataja.ee/akt/122122025002)
- [Korrakaitseseadus](https://www.riigiteataja.ee/akt/107042026007)

Relvaseaduse järgmine redaktsioon jõustub 1. oktoobril 2026. Selles muutub nende küsimuste seisukohalt ebaoluline sõjalise riigikaitse valdkonna ministri nimetus; kontrollitud tsiviilrelvade reeglid ei muutu. Küsimustik ei ole Politsei- ja Piirivalveameti ametlik eksamipank ega asenda praktilist relva- või esmaabikoolitust.

## Vorming ja kontroll

- `legacyId` säilitab varasema küsimuse numbri ning sellest saab aktiivse küsimuse numbriline `id`.
- `correct` sisaldab õigete vastusevariantide nullist algavaid järjekorranumbreid.
- `multiple` on `true`, kui õigeid vastuseid on mitu.
- `references` näitab küsimuse koostamisel kontrollitud sätteid.
- Valideerija kontrollib ka seda, et `coverage-audit.md` kaardistaks kõik 71 varasemat numbrit olemasolevatele aktiivsetele küsimustele; sisulise vastavuse ülevaatus jääb inimülesandeks.

Kontrollimiseks käivita repositooriumi juurkaustas:

```powershell
node scripts/validate-question-sets.cjs
```
