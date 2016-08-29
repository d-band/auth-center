export default class Select {
  constructor(elem, options = {}) {
    this.$elem = typeof elem === 'string' ? $(elem) : elem;
    if (!this.$elem.length) return;
    this.options = options;
    this.$input = $('input', this.$elem);
    this.$list = $('.dropdown-menu', this.$elem);
    this.selected = false;
    this.bindEvent();
  }
  bindEvent() {
    this.$elem.on('mousedown', '.item', this.select.bind(this));
    this.$input.on('focus', e => {
      this.filter(e.target.value);
    }).on('blur', e => {
      this.$elem.removeClass('open');
    }).keyup((e) => {
      const code = e.keyCode || e.which;
      if (code === 38) {
        const $cur = $('.active', this.$elem);
        const $prev = $cur.prev();
        if ($prev.length) {
          $cur.removeClass('active');
          $prev.addClass('active');
        }
        return false;
      }
      if (code === 40) {
        const $cur = $('.active', this.$elem);
        const $next = $cur.next();
        if ($next.length) {
          $cur.removeClass('active');
          $next.addClass('active');
        }
        return false;
      }
      if (code === 13) {
        $('.active .item', this.$elem).trigger('mousedown');
        return false;
      }

      this.selected = false;
      this.filter(e.target.value);
    }).keypress(e => {
      const code = e.keyCode || e.which;
      return code !== 13;
    }).on('change', (e) => {
      if (!this.selected) {
        $(e.target).val('');
      }
    });
  }
  select(e) {
    this.selected = true;
    const text = $(e.target).text();
    this.$input.val(text);
    this.$elem.removeClass('open');
  }
  filter(text) {
    const {data} = this.options;
    if (typeof data === 'function') {
      data(text, list => {
        this.$elem.addClass('open');
        this.render(list, text);
      });
    } else {
      if (data && data.length) {
        const list = data.filter(d => d.indexOf(text) >= 0);
        this.$elem.addClass('open');
        this.render(list, text);
      }
    }
  }
  render(list, text) {
    if (list.length) {
      let index = list.indexOf(text);
      index = index > -1 ? index : 0;
      const html = list.map((d, i) => {
        const c = i === index ? 'active' : '';
        return `<li class="${c}"><a class="item">${d}</a></li>`;
      }).join('\n');
      this.$list.html(html);
    } else {
      this.$list.html('<li><a style="color:#999;">No Data</a></li>');
    }
  }
}