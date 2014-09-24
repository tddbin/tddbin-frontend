/*
- when NO key combo is pressed yet
- when INVALID key combo is pressed
  - visible shall be false

- when a VALID key combo is pressed
  - show all shortcuts filtered by the keycombo
  - set visible=true

  - pre-process shortcuts into ui-shortcuts (or alike) where 'Meta' is replace by '⌘' etc.

 */

function getViewDataByPressedKeyCombo() {
  return {visible: false};
}

describe('NO key combo is pressed yet', function() {
  it('should return visible=false', function() {
    var data = getViewDataByPressedKeyCombo([]);
    expect(data.visible).toBe(false);
  });
});
