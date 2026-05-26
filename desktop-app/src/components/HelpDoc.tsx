export function HelpDoc() {
  return (
    <div className="prose prose-sm max-w-none">
      <h2 className="text-lg font-bold text-gray-900 mb-4">使用说明</h2>
      
      <p className="text-sm text-gray-700 mb-4">
        自动化选品功能可以帮助你寻找OZON上符合你设置的条件的商品，会自动扩店，自动去1688上寻找同款产品。
      </p>
      
      <h3 className="text-base font-semibold text-gray-900 mt-6 mb-2">使用前准备</h3>
      <ol className="text-sm text-gray-600 list-decimal list-inside space-y-2">
        <li>需要一个店铺表，在店铺表里先填写一些OZON的店铺链接，让程序有一个启动的入口</li>
        <li>店铺名称表：这个表不用我们手动操作，一个空的表即可，只需在第一行写如数据即可</li>
        <li>选品表：选出来的品，软件会自动写入这个表，一个空表即可</li>
        <li>浏览器下载路径：需要设置浏览器的下载位置，要和浏览器的下载位置一致</li>
      </ol>
      
      <h3 className="text-base font-semibold text-gray-900 mt-6 mb-2">核心参数说明</h3>
      <p className="text-sm text-gray-600">
        这里面是设置选什么样的品，按照你的选品逻辑设置即可。佣金比例设置的意思是：正常情况下，我们根据产品的价格选择执行插件显示的佣金比例，但有时候，网页不会显示，我们就会根据这个佣金比例来计算利润等。
      </p>
      
      <h3 className="text-base font-semibold text-gray-900 mt-6 mb-2">物流渠道</h3>
      <p className="text-sm text-gray-600">
        设置不同物流类型的运费价格，用于利润计算。
      </p>
    </div>
  )
}
