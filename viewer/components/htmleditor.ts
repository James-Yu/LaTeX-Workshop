export function editHTML() {
    document.getElementById('sidebarResizer')?.classList.add('hidden')
    document.getElementsByClassName('toolbar')[0]?.classList.add('hide')
    document.getElementById('firstPage')?.previousElementSibling?.classList.add('visibleLargeView')

    const template = document.createElement('template')
    template.innerHTML =
`<button id="synctexOffButton" class="secondaryToolbarButton" title="Disable forward SyncTeX" tabindex="70">
    <input id="synctexOff" type="checkbox"><span>Stop SyncTeX</span>
</button>
<button id="autoReloadOffButton" class="secondaryToolbarButton" title="Disable auto reload" tabindex="71">
    <input id="autoReloadOff" type="checkbox"><span>Auto Reload</span>
</button>
<div class="horizontalToolbarSeparator"></div>`
    let anchor: HTMLElement | Element | null | undefined = document.getElementById('documentProperties')
    if (anchor) {
        for (const node of template.content.childNodes) {
            anchor.parentNode?.insertBefore(node, anchor)
        }
    }

    template.innerHTML =
`<!-- History back button, useful in the embedded viewer -->
<button class="toolbarButton findPrevious" title="Back (←)" id="historyBack">
  <span>Back</span>
</button>
<button class="toolbarButton findNext" title="Forward (⇧←)" id="historyForward">
  <span>Forward</span>
</button>`
    anchor = document.getElementById('sidebarToggle')?.nextElementSibling
    if (anchor) {
        for (const node of template.content.childNodes) {
            anchor.parentNode?.insertBefore(node, anchor)
        }
    }

    template.innerHTML = '<option id="trimOption" title="" disabled="disabled" hidden="true"> Trimming </option>'
    anchor = document.getElementById('scaleSelect')
    if (anchor) {
        for (const node of template.content.childNodes) {
            anchor.appendChild(node)
        }
    }

    template.innerHTML =
`<span id="trimSelectContainer" class="dropdownToolbarButton">
<select id="trimSelect" title="Trim" tabindex="23" >
  <option title="" value="0.0" selected="selected" >No page trimming</option>
  <option title="" value="0.05" >Trim 5% at margin</option>
  <option title="" value="0.10" >Trim 10% at margin</option>
  <option title="" value="0.15" >Trim 15% at margin</option>
</select>
</span>`
    anchor = document.getElementById('scaleSelectContainer')
    if (anchor) {
        for (const node of template.content.childNodes) {
            anchor.parentNode?.appendChild(node)
        }
    }

    template.innerHTML = '<div id="synctex-indicator"></div>'
    anchor = document.getElementById('viewerContainer')
    if (anchor) {
        for (const node of template.content.childNodes) {
            anchor.appendChild(node)
        }
    }
}
