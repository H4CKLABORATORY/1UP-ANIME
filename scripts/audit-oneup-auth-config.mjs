// Read-only audit. Never print the Management API response: it contains secrets.
import assert from 'node:assert/strict';
const {SUPABASE_ACCESS_TOKEN:token,ONEUP_PROJECT_REF:ref}=process.env;
assert.ok(token&&/^[a-z0-9]{20}$/.test(ref||''),'Set SUPABASE_ACCESS_TOKEN and ONEUP_PROJECT_REF privately.');
const r=await fetch('https://api.supabase.com/v1/projects/'+ref+'/config/auth',{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(20000)});
assert.equal(r.status,200,'Cannot audit Auth configuration.');
const c=await r.json();const failures=[];
const check=(name,ok)=>{if(!ok)failures.push(name);};
check('email enabled',c.external_email_enabled===true);
check('email confirmation required',c.mailer_autoconfirm===false);
check('unverified login disabled',c.mailer_allow_unverified_email_sign_ins!==true);
check('OTP exactly 6 digits',c.mailer_otp_length===6);
check('OTP expiry 600 seconds',c.mailer_otp_exp===600);
check('password minimum 15',c.password_min_length>=15);
check('JWT maximum 600 seconds',c.jwt_exp>0&&c.jwt_exp<=600);
check('CAPTCHA enabled',c.security_captcha_enabled===true&&c.security_captcha_provider==='turnstile'&&Boolean(c.security_captcha_secret));
check('custom SMTP',c.smtp_host==='smtp.resend.com'&&Boolean(c.smtp_pass)&&Boolean(c.smtp_admin_email));
check('confirmation template uses code',c.mailer_templates_confirmation_content?.includes('{{ .Token }}'));
check('recovery template uses code',c.mailer_templates_recovery_content?.includes('{{ .Token }}'));
check('provider verify rate limit',c.rate_limit_verify>0&&c.rate_limit_verify<=30);
check('provider email limit',c.rate_limit_email_sent>0&&c.rate_limit_email_sent<=30);
if(failures.length){console.error('Configuration needs action: '+failures.join('; '));process.exitCode=1;}
else console.log('PASS Auth configuration checks. DNS, SMTP delivery, broker deployment and end-to-end verification still required.');
