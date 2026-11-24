import sys,asyncio
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
    pg.goto('file:///home/claude/app/index.html')
    pg.click('#mk'); pg.fill('#u','mai'); pg.fill('#p','pass1'); pg.fill('#d','Mai'); pg.fill('#c','WRITE2026'); pg.click('#mk')
    pg.wait_for_selector('.grid'); print('home:',pg.inner_text('h1'), len(pg.query_selector_all('.mod')),'modules', len(pg.query_selector_all('.mod.locked')),'locked')
    pg.click('.mod[data-m="1"]'); pg.wait_for_selector('.steps')
    pg.click('[data-st="1"]');
    for i in pg.query_selector_all('.gv'): i.fill('I wrote a long sentence using this word today properly')
    pg.click('#sv'); pg.click('[data-st="2"]')
    for i in range(2): pg.click(f'input[name=q{i}][value="0"]')
    pg.click('#qs'); pg.wait_for_selector('.opt.right, .opt.wrong')
    pg.click('[data-st="3"]')
    for t in pg.query_selector_all('.gs'): t.fill('The old dog sniffed the wet pavement and trotted slowly past the noisy market stalls today')
    pg.click('#ss'); pg.click('[data-st="4"]')
    # paste test
    pg.click('#fin'); pg.evaluate("""()=>{const t=document.getElementById('fin');const e=new Event('paste',{cancelable:true,bubbles:true});t.dispatchEvent(e);window.__pd=e.defaultPrevented}""")
    print('paste prevented:',pg.evaluate('window.__pd'), '| warn shown:', pg.is_visible('#gw'))
    pg.click('#fin'); pg.keyboard.type('The rain hammered the tin roof and I clutched my cold cup. "Run," Mai whispered, and we ran. '*6, delay=1)
    pg.click('#fs'); pg.wait_for_selector('.score'); print('score:',pg.inner_text('.score'))
    print(pg.inner_text('.card').split('\n')[:4])
    pg.click('text=Sign out'); pg.fill('#u','tutor'); pg.fill('#p','tutor'); pg.click('#in'); pg.wait_for_selector('table')
    print('tutor sees:',pg.inner_text('table')[:150].replace('\n',' | '))
    pg.click('[data-s]'); pg.wait_for_selector('.rb'); pg.fill('.rs','88'); pg.fill('.rc','Lovely detail!'); pg.click('.rb'); pg.wait_for_selector('.pill.ok')
    pg.click('text=Sign out'); pg.fill('#u','mai'); pg.fill('#p','pass1'); pg.click('#in'); pg.wait_for_selector('.grid'); print('mod1 badge:',pg.inner_text('.mod[data-m="1"]'))
    pg.click('text=Free write'); pg.click('#fb'); pg.keyboard.type('The lamp flickered in the quiet kitchen and the soup smelled of ginger. '*5, delay=1); pg.click('#fg'); pg.wait_for_selector('.pill'); print('free ok')
    pg.screenshot(path='/tmp/home.png',full_page=True); b.close()
print('errors:',errs)
