import { test, expect } from '@playwright/test';
test('agent can analyze, inspect, draft, approve and hand off the case',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{name:'Delivered, but to whom?'})).toBeVisible();
 await page.getByRole('button',{name:/Analyze case|Re-analyze case/}).click();await expect(page.getByRole('heading',{name:/refund was promised yesterday|refund initiation is already recorded/})).toBeVisible();
 await page.getByRole('button',{name:'SUP-1042-01',exact:true}).first().click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog')).toContainText('Your refund will be initiated within 24 hours.');await page.getByRole('button',{name:'Close source'}).click();
 await page.getByRole('button',{name:'Generate reply',exact:true}).click();await expect(page.getByLabel('Editable customer reply draft')).toContainText('neighbors');
 await page.screenshot({path:'docs/dashboard-desktop.png',fullPage:true});
 await page.getByRole('button',{name:/Approve simulated refund|Approve simulated status review/}).click();await expect(page.getByRole('status')).toContainText('Simulated action recorded');
 await page.getByRole('button',{name:'Switch agent',exact:true}).click();await expect(page.getByRole('heading',{name:'A new agent. The same memory.'})).toBeVisible();await expect(page.getByText('Persisted in SQLite')).toBeVisible();await page.reload();await page.getByRole('button',{name:'Shift handoff',exact:true}).first().click();await expect(page.getByText('Persisted in SQLite')).toBeVisible();
 await page.screenshot({path:'docs/dashboard-handoff.png',fullPage:true});
});
test('shared household isolation and missing-evidence paths are visible',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/03 Shared household/}).click();await page.getByRole('button',{name:/Analyze case|Re-analyze case/}).click();await expect(page.getByText('No agent commitment found')).toBeVisible();await expect(page.getByRole('button',{name:'Approve simulated escalation'})).toBeVisible();
 await page.getByRole('button',{name:/04 Insufficient evidence/}).click();await page.getByRole('button',{name:/Analyze case|Re-analyze case/}).click();await expect(page.getByText('Applicable delivery-dispute policy',{exact:true})).toBeVisible();
});
test('mobile layout fits and citations remain accessible',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.getByRole('heading',{name:'Delivered, but to whom?'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Next justified action'})).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);expect(overflow).toBe(false);await page.screenshot({path:'docs/dashboard-mobile.png',fullPage:true});
});
