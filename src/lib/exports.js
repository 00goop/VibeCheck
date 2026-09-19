export function csvCell(value='') {
 const text=String(value??'')
 const protectedText=/^[\s]*[=+@-]|^[\t\r\n]/.test(text)?"'"+text:text
 return protectedText.replace(/"/g,'""')
}
export function vcardText(value='') {
 return String(value??'').replace(/\\/g,'\\\\').replace(/[\r\n]+/g,' ').replace(/,/g,'\\,').replace(/;/g,'\\;')
}
export function resolveTheirCard(match,myCardId) {
 if(!myCardId)return null
 return match.card_a===myCardId?match.card_b_snapshot:match.card_b===myCardId?match.card_a_snapshot:null
}
