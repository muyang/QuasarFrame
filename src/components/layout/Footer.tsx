export function Footer() {
  return (
    <footer className="border-t border-border/30 bg-cinematic/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="font-mono text-lg font-bold">
              <span className="text-primary">Quasar</span>
              <span className="text-foreground">Frame</span>
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              基于数字地球的摄影选景平台
              <br />
              Photography location scouting on a digital earth
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">产品</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>数字地球选景</li>
              <li>智能推荐</li>
              <li>电子相框</li>
              <li>定制订阅</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">联系</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>关于我们</li>
              <li>合作景区</li>
              <li>开发者 API</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/20 text-center text-xs text-muted-foreground">
          © 2026 QuasarFrame. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
