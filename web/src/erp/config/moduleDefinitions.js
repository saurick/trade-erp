import { BOX_STATUS } from '../constants/workflow'
import { calcReceivableDate, createAutoCode } from '../utils/finance'
import { calcItemsTotal, calcItemsQty } from '../utils/items'

const yesNoOptions = [
  { label: '是', value: '是' },
  { label: '否', value: '否' },
]

const transportOptions = [
  { label: '海运', value: '海运' },
  { label: '空运', value: '空运' },
  { label: '快递', value: '快递' },
]

const currencyOptions = [
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
  { label: 'CNY', value: 'CNY' },
]

const priceTermOptions = [
  { label: 'FOB', value: 'FOB' },
  { label: 'CIF', value: 'CIF' },
  { label: 'EXW', value: 'EXW' },
]

const payModeOptions = [
  { label: 'T/T', value: 'T/T' },
  { label: 'L/C', value: 'L/C' },
  { label: 'D/P', value: 'D/P' },
]

const deliveryMethodOptions = [
  { label: '海运', value: '海运' },
  { label: '空运', value: '空运' },
  { label: '快递', value: '快递' },
]

const courierPayOptions = [
  { label: '寄付', value: '寄付' },
  { label: '到付', value: '到付' },
  { label: '第三方', value: '第三方' },
]

const itemFieldsQuote = [
  { name: 'productName', label: '产品名称', required: true },
  { name: 'quantity', label: '数量', type: 'number', required: true },
  { name: 'unitPrice', label: '单价', type: 'number', required: true },
  { name: 'totalPrice', label: '金额', type: 'number' },
]

const itemFieldsExport = [
  { name: 'productName', label: '产品名称', required: true },
  { name: 'cnDesc', label: '中文描述', required: true },
  { name: 'enDesc', label: '英文描述', required: true },
  { name: 'quantity', label: '数量', type: 'number', required: true },
  { name: 'unitPrice', label: '单价', type: 'number', required: true },
  { name: 'totalPrice', label: '金额', type: 'number' },
  { name: 'packDetail', label: '包装明细' },
]

const itemFieldsPurchase = [
  { name: 'productName', label: '产品名称', required: true },
  { name: 'specCode', label: '规格/图号' },
  { name: 'quantity', label: '数量', type: 'number', required: true },
  { name: 'unitPrice', label: '单价', type: 'number', required: true },
  { name: 'totalPrice', label: '金额', type: 'number' },
]

const itemFieldsShipment = [
  { name: 'productModel', label: '产品型号', required: true },
  { name: 'quantity', label: '数量', type: 'number', required: true },
  { name: 'unitPrice', label: '单价', type: 'number' },
  { name: 'packDetail', label: '包装明细' },
  { name: 'netWeight', label: '净重', type: 'number' },
  { name: 'grossWeight', label: '毛重', type: 'number' },
  { name: 'volume', label: '体积', type: 'number' },
]

export const moduleDefinitions = [
  {
    key: 'partners',
    title: '客户/供应商',
    path: '/master/partners',
    section: 'master',
    codePrefix: 'CS',
    defaultStatus: BOX_STATUS.AUTO,
    description:
      '客户/供应商建档（合作客户/供应商可自动编码，地址用于发票显示）。',
    columns: [
      { title: '代码', dataIndex: 'code' },
      { title: '类型', dataIndex: 'partnerType' },
      { title: '名称', dataIndex: 'name' },
      { title: '付款周期(天)', dataIndex: 'paymentCycleDays' },
      { title: '联系人', dataIndex: 'contact' },
      { title: '联系方式', dataIndex: 'contactPhone' },
    ],
    codeBuilder: (values, { currentSize }) => {
      if (values.partnerType === '潜在客户') {
        return ''
      }
      return createAutoCode('CS', currentSize)
    },
    formFields: [
      {
        name: 'partnerType',
        label: '客户类型',
        type: 'select',
        required: true,
        options: [
          { label: '合作客户', value: '合作客户' },
          { label: '潜在客户', value: '潜在客户' },
          { label: '合作供应商', value: '合作供应商' },
        ],
      },
      { name: 'name', label: '客户/供应商名称', type: 'input', required: true },
      { name: 'address', label: '客户地址', type: 'textarea', required: true },
      { name: 'contact', label: '联系人', type: 'input', required: true },
      {
        name: 'contactPhone',
        label: '联系方式',
        type: 'input',
        required: true,
      },
      { name: 'taxNo', label: '税号', type: 'input' },
      {
        name: 'paymentCycleDays',
        label: '付款周期(天)',
        type: 'number',
        required: true,
      },
    ],
  },
  {
    key: 'products',
    title: '产品',
    path: '/master/products',
    section: 'master',
    codePrefix: 'PD',
    defaultStatus: BOX_STATUS.AUTO,
    description: '产品建档（编码、海关编码、规格图号、中英文描述、附件）。',
    columns: [
      { title: '产品编码', dataIndex: 'code' },
      { title: '海关编码', dataIndex: 'hsCode' },
      { title: '规格编码/图号', dataIndex: 'specCode' },
      { title: '中文描述', dataIndex: 'cnDesc' },
      { title: '英文描述', dataIndex: 'enDesc' },
    ],
    formFields: [
      {
        name: 'hsCode',
        label: '海关编码',
        type: 'select',
        required: true,
        options: [
          { label: '85051110', value: '85051110' },
          { label: '85051190', value: '85051190' },
        ],
      },
      {
        name: 'specCode',
        label: '规格编码/图号',
        type: 'input',
        required: true,
      },
      { name: 'cnDesc', label: '中文描述', type: 'input', required: true },
      { name: 'enDesc', label: '英文描述', type: 'input', required: true },
      {
        name: 'attachment',
        label: '附件（图纸等）',
        type: 'upload',
        uploadCategory: 'attachments',
      },
    ],
  },
  {
    key: 'quotations',
    title: '报价单（可选）',
    path: '/sales/quotations',
    section: 'sales',
    codePrefix: 'QT',
    defaultStatus: BOX_STATUS.DRAFT,
    description: '报价录入与产品明细，支持打印 PI；客户接受后可生成外销。',
    columns: [
      { title: '报价单编码', dataIndex: 'code' },
      { title: '客户', dataIndex: 'customerName' },
      { title: '报价日期', dataIndex: 'quotedDate' },
      { title: '币种', dataIndex: 'currency' },
      { title: '合计金额', dataIndex: 'totalAmount' },
      { title: '明细', dataIndex: 'items', renderType: 'items-summary' },
    ],
    formFields: [
      {
        name: 'customerName',
        label: '客户名称',
        type: 'select-ref',
        refModule: 'partners',
        required: true,
        filter: (item) => item.partnerType !== '合作供应商',
      },
      { name: 'quotedDate', label: '报价日期', type: 'date', required: true },
      { name: 'contactName', label: '联系人', type: 'input' },
      { name: 'contactTel', label: '联系方式', type: 'input' },
      { name: 'contactEmail', label: '邮箱', type: 'input' },
      {
        name: 'currency',
        label: '币种',
        type: 'select',
        required: true,
        options: currencyOptions,
      },
      {
        name: 'priceTerm',
        label: '运输条款',
        type: 'select',
        options: priceTermOptions,
      },
      { name: 'startPlace', label: '起运地', type: 'input' },
      { name: 'endPlace', label: '目的地', type: 'input' },
      {
        name: 'deliveryMethod',
        label: '运输方式',
        type: 'select',
        options: deliveryMethodOptions,
      },
      {
        name: 'payMode',
        label: '付款方式',
        type: 'select',
        options: payModeOptions,
      },
      { name: 'validPeriod', label: '有效期（天）', type: 'number' },
      { name: 'remark', label: '备注', type: 'textarea' },
      {
        name: 'items',
        label: '产品明细',
        type: 'items',
        itemFields: itemFieldsQuote,
      },
    ],
    beforeSave: (values) => ({
      ...values,
      totalAmount: calcItemsTotal(values.items || []),
    }),
    rowActions: [
      {
        key: 'to-export',
        label: '生成外销',
        type: 'primary',
        onRun: (record, helpers) => {
          helpers.createLinkedRecord('exportSales', record, (source) => ({
            customerName: source.customerName,
            customerContractNo: source.customerContractNo || source.code,
            orderNo: source.orderNo || source.code,
            orderDate: source.quotedDate,
            signDate: source.quotedDate,
            deliveryDate: source.readyDate || source.deliveryDate,
            transportType: source.deliveryMethod,
            paymentMethod: source.payMode,
            priceTerm: source.priceTerm,
            startPlace: source.startPlace,
            endPlace: source.endPlace,
            items: source.items || [],
            remark: source.remark,
            sourceQuotationCode: source.code,
          }))
          helpers.notify.success('已生成外销')
        },
      },
      {
        key: 'print-pi',
        label: '打印PI',
        onRun: (record, helpers) => helpers.openPrintWindow('pi', record),
      },
    ],
  },
  {
    key: 'exportSales',
    title: '外销',
    path: '/sales/export',
    section: 'sales',
    codePrefix: 'XS',
    defaultStatus: BOX_STATUS.DRAFT,
    description: '外销录入，支持 PI 打印与审批。',
    columns: [
      { title: '合同编号', dataIndex: 'code' },
      { title: '客户合同号', dataIndex: 'customerContractNo' },
      { title: '客户名称', dataIndex: 'customerName' },
      { title: '签约日期', dataIndex: 'signDate' },
      { title: '备货期限', dataIndex: 'deliveryDate' },
      { title: '运输方式', dataIndex: 'transportType' },
    ],
    formFields: [
      {
        name: 'customerName',
        label: '客户名称',
        type: 'select-ref',
        refModule: 'partners',
        required: true,
        filter: (item) => item.partnerType !== '合作供应商',
      },
      {
        name: 'customerContractNo',
        label: '客户合同号',
        type: 'input',
        required: true,
      },
      { name: 'orderNo', label: '订单号', type: 'input' },
      { name: 'orderDate', label: '下单时间', type: 'date' },
      { name: 'signDate', label: '签约日期', type: 'date', required: true },
      {
        name: 'deliveryDate',
        label: '备货期限（预计发货日期）',
        type: 'date',
        required: true,
      },
      {
        name: 'transportType',
        label: '运输方式',
        type: 'select',
        options: transportOptions,
        required: true,
      },
      {
        name: 'paymentMethod',
        label: '付款方式',
        type: 'select',
        options: payModeOptions,
      },
      {
        name: 'priceTerm',
        label: '运输条款',
        type: 'select',
        options: priceTermOptions,
      },
      { name: 'startPlace', label: '起运地', type: 'input' },
      { name: 'endPlace', label: '目的地', type: 'input' },
      { name: 'prepayRatio', label: '预收款比例(%)', type: 'number' },
      {
        name: 'orderFlow',
        label: '订单流向',
        type: 'select',
        options: [
          { label: '成品采购', value: '成品采购' },
          { label: '内部生产', value: '内部生产' },
        ],
        required: true,
      },
      { name: 'remark', label: '备注', type: 'textarea' },
      {
        name: 'items',
        label: '产品明细',
        type: 'items',
        itemFields: itemFieldsExport,
      },
    ],
    beforeSave: (values) => ({
      ...values,
      totalAmount: calcItemsTotal(values.items || []),
    }),
    rowActions: [
      {
        key: 'to-purchase',
        label: '生成采购合同',
        type: 'primary',
        onRun: (record, helpers) => {
          const suppliers = helpers
            .getModuleRecords('partners')
            .filter((item) => item.partnerType === '合作供应商')
          helpers.createLinkedRecord('purchaseContracts', record, (source) => ({
            supplierName: suppliers[0]?.name || '',
            signDate: source.signDate,
            deliveryDate: source.deliveryDate,
            deliveryAddress: source.startPlace || '杭州临平仓',
            follower: '',
            buyer: '',
            invoiceRequired: '是',
            items: source.items || [],
            remark: source.remark,
            sourceExportCode: source.code,
          }))
          helpers.notify.success('已生成采购合同')
        },
      },
      {
        key: 'to-shipment',
        label: '生成出运明细',
        onRun: (record, helpers) => {
          helpers.createLinkedRecord('shipmentDetails', record, (source) => ({
            startPort: source.startPlace,
            destPort: source.endPlace,
            shipToAddress: source.shipToAddress || '',
            transportType: source.transportType,
            arriveCountry: source.arriveCountry || '',
            salesOwner: source.salesOwner || '',
            totalPackages: calcItemsQty(source.items || []),
            items: (source.items || []).map((item) => ({
              productModel: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              packDetail: item.packDetail,
            })),
            remark: source.remark,
            sourceExportCode: source.code,
            customerName: source.customerName,
          }))
          helpers.notify.success('已生成出运明细')
        },
      },
      {
        key: 'print-pi',
        label: '打印PI',
        onRun: (record, helpers) => helpers.openPrintWindow('pi', record),
      },
    ],
  },
  {
    key: 'purchaseContracts',
    title: '采购（采购合同）',
    path: '/purchase/contracts',
    section: 'purchase',
    codePrefix: 'CG',
    defaultStatus: BOX_STATUS.DRAFT,
    description: '从外销导入产品数量等信息，生成采购合同号并输出固定模板。',
    columns: [
      { title: '采购合同号', dataIndex: 'code' },
      { title: '供应商', dataIndex: 'supplierName' },
      { title: '签约日期', dataIndex: 'signDate' },
      { title: '交货日期', dataIndex: 'deliveryDate' },
      { title: '交货地点', dataIndex: 'deliveryAddress' },
      { title: '开票与否', dataIndex: 'invoiceRequired' },
    ],
    codeBuilder: (values, { currentSize }) =>
      createAutoCode('CG', currentSize, new Date(), [values.salesNo]),
    formFields: [
      {
        name: 'supplierName',
        label: '厂商名称/供应商',
        type: 'select-ref',
        refModule: 'partners',
        required: true,
        filter: (item) => item.partnerType === '合作供应商',
      },
      { name: 'signDate', label: '签约日期', type: 'date', required: true },
      { name: 'salesNo', label: '业务员编号', type: 'input', required: true },
      { name: 'deliveryDate', label: '交货日期', type: 'date', required: true },
      {
        name: 'deliveryAddress',
        label: '交货地点',
        type: 'input',
        required: true,
      },
      { name: 'follower', label: '跟单员', type: 'input' },
      { name: 'buyer', label: '采购业务员', type: 'input' },
      {
        name: 'invoiceRequired',
        label: '开票与否',
        type: 'select',
        options: yesNoOptions,
        required: true,
      },
      {
        name: 'attachment',
        label: '附件（图纸等）',
        type: 'upload',
        uploadCategory: 'attachments',
      },
      { name: 'remark', label: '备注', type: 'textarea' },
      {
        name: 'items',
        label: '产品信息（导入）',
        type: 'items',
        itemFields: itemFieldsPurchase,
      },
    ],
    beforeSave: (values) => ({
      ...values,
      totalAmount: calcItemsTotal(values.items || []),
    }),
    rowActions: [
      {
        key: 'to-inbound',
        label: '生成入库通知',
        type: 'primary',
        onRun: (record, helpers) => {
          helpers.createLinkedRecord('inbound', record, (source) => ({
            purchaseCode: source.code,
            productName: source.items?.[0]?.productName || '',
            quantity: source.items?.[0]?.quantity || 0,
            warehouseName: '杭州一号仓',
            location: 'A-01-01',
            qcStatus: '待检验',
            remark: source.remark,
            sourcePurchaseCode: source.code,
          }))
          helpers.notify.success('已生成入库通知')
        },
      },
      {
        key: 'print-purchase',
        label: '打印采购合同',
        onRun: (record, helpers) => helpers.openPrintWindow('purchase', record),
      },
    ],
  },
  {
    key: 'inbound',
    title: '入库通知/检验/入库',
    path: '/warehouse/inbound',
    section: 'warehouse',
    codePrefix: 'RK',
    defaultStatus: BOX_STATUS.DRAFT,
    description:
      '采购到货→入库通知→质检→允许入库→入库单（货位、检测报告附件）。',
    columns: [
      { title: '入库通知单号', dataIndex: 'code' },
      { title: '入库单号', dataIndex: 'entryNo' },
      { title: '采购合同号', dataIndex: 'purchaseCode' },
      { title: '产品', dataIndex: 'productName' },
      { title: '货位', dataIndex: 'location' },
      { title: '质检状态', dataIndex: 'qcStatus' },
      { title: '数量', dataIndex: 'quantity' },
    ],
    formFields: [
      {
        name: 'purchaseCode',
        label: '采购合同号',
        type: 'input',
        required: true,
      },
      { name: 'productName', label: '产品名称', type: 'input', required: true },
      { name: 'warehouseName', label: '仓库', type: 'input', required: true },
      { name: 'location', label: '货位', type: 'input', required: true },
      {
        name: 'qcStatus',
        label: '质检状态',
        type: 'select',
        options: [
          { label: '待检验', value: '待检验' },
          { label: '检验合格', value: '检验合格' },
          { label: '检验不合格', value: '检验不合格' },
        ],
        required: true,
      },
      { name: 'quantity', label: '数量', type: 'number', required: true },
      {
        name: 'qcAttachment',
        label: '检测报告附件',
        type: 'upload',
        uploadCategory: 'attachments',
      },
      { name: 'remark', label: '备注（装箱明细）', type: 'textarea' },
    ],
    rowActions: [
      {
        key: 'allow-entry',
        label: '允许入库',
        type: 'primary',
        onRun: (record, helpers) => {
          if (record.qcStatus !== '检验合格') {
            helpers.notify.warning('质检状态需为“检验合格”才能入库')
            return
          }
          helpers.receiveInbound(record)
          helpers.notify.success('已生成入库单并更新库存')
        },
      },
    ],
  },
  {
    key: 'inventory',
    title: '库存',
    path: '/warehouse/inventory',
    section: 'warehouse',
    codePrefix: 'KC',
    defaultStatus: BOX_STATUS.AUTO,
    description: '单仓库+货位实时库存；入库增加、出库扣减联动。',
    columns: [
      { title: '库存编码', dataIndex: 'code' },
      { title: '产品名称', dataIndex: 'productName' },
      { title: '仓库', dataIndex: 'warehouseName' },
      { title: '货位', dataIndex: 'location' },
      { title: '可用数量', dataIndex: 'availableQty' },
      { title: '锁定数量', dataIndex: 'lockedQty' },
    ],
    formFields: [
      { name: 'productName', label: '产品名称', type: 'input', required: true },
      {
        name: 'warehouseName',
        label: '仓库名称',
        type: 'input',
        required: true,
      },
      { name: 'location', label: '货位', type: 'input', required: true },
      {
        name: 'availableQty',
        label: '可用数量',
        type: 'number',
        required: true,
      },
      { name: 'lockedQty', label: '锁定数量', type: 'number', required: true },
    ],
  },
  {
    key: 'shipmentDetails',
    title: '出运明细',
    path: '/shipping/details',
    section: 'sales',
    codePrefix: 'CY',
    defaultStatus: BOX_STATUS.DRAFT,
    description: '导入外销明细并提交审批。',
    columns: [
      { title: '发票号', dataIndex: 'code' },
      { title: '客户', dataIndex: 'customerName' },
      { title: '起运地', dataIndex: 'startPort' },
      { title: '目的地', dataIndex: 'destPort' },
      { title: '运输方式', dataIndex: 'transportType' },
      { title: '总件数', dataIndex: 'totalPackages' },
      { title: '业务员', dataIndex: 'salesOwner' },
    ],
    formFields: [
      {
        name: 'customerName',
        label: '客户名称',
        type: 'select-ref',
        refModule: 'partners',
        required: true,
        filter: (item) => item.partnerType !== '合作供应商',
      },
      { name: 'startPort', label: '起运地', type: 'input', required: true },
      { name: 'destPort', label: '目的地', type: 'input', required: true },
      {
        name: 'shipToAddress',
        label: '收货地址（SHIP TO）',
        type: 'textarea',
        required: true,
      },
      {
        name: 'transportType',
        label: '运输方式',
        type: 'select',
        options: transportOptions,
        required: true,
      },
      {
        name: 'courierPayMode',
        label: '快件付款方式',
        type: 'select',
        options: courierPayOptions,
      },
      { name: 'collectAccount', label: '到付账号', type: 'input' },
      { name: 'arriveCountry', label: '运抵国', type: 'input', required: true },
      { name: 'goodsNameEn', label: '英文货名', type: 'input' },
      { name: 'salesOwner', label: '业务员', type: 'input', required: true },
      { name: 'warehouseShipDate', label: '进仓发货日期', type: 'date' },
      {
        name: 'totalPackages',
        label: '总件数（木箱数）',
        type: 'number',
        required: true,
      },
      { name: 'woodCaseSize', label: '木箱尺寸', type: 'input' },
      { name: 'customsChannel', label: '报关渠道', type: 'input' },
      { name: 'marking', label: '唛头', type: 'textarea' },
      {
        name: 'attachments',
        label: '附件（进仓通知/随货发票）',
        type: 'upload',
        multiple: true,
        uploadCategory: 'attachments',
      },
      { name: 'remark', label: '备注（收件人详细信息）', type: 'textarea' },
      {
        name: 'items',
        label: '产品条目',
        type: 'items',
        itemFields: itemFieldsShipment,
      },
    ],
    beforeSave: (values) => ({
      ...values,
      totalPackages: values.totalPackages || calcItemsQty(values.items || []),
    }),
    rowActions: [
      {
        key: 'to-outbound',
        label: '生成出库',
        type: 'primary',
        onRun: (record, helpers) => {
          const firstItem = record.items?.[0] || {}
          helpers.createLinkedRecord(
            'outbound',
            record,
            (source) => ({
              shipmentCode: source.code,
              productName:
                firstItem.productModel || firstItem.productName || '',
              quantity: firstItem.quantity || 0,
              warehouseName: '杭州一号仓',
              location: 'A-01-03',
              remark: '销售出库',
            }),
            {
              inventoryDelta: {
                productName:
                  firstItem.productModel || firstItem.productName || '',
                warehouseName: '杭州一号仓',
                location: 'A-01-03',
                deltaQty: -Number(firstItem.quantity || 0),
              },
            }
          )
          helpers.notify.success('已生成出库并扣减库存')
        },
      },
      {
        key: 'to-settlement',
        label: '生成结汇',
        onRun: (record, helpers) => {
          const partners = helpers.getModuleRecords('partners')
          const matched = partners.find(
            (item) => item.name === record.customerName
          )
          helpers.createLinkedRecord('settlements', record, (source) => ({
            invoiceNo: source.code,
            shipDate: source.warehouseShipDate || source.signDate,
            paymentCycleDays: matched?.paymentCycleDays || 0,
            amount: calcItemsTotal(source.items || []),
            customerName: source.customerName,
          }))
          helpers.notify.success('已生成结汇')
        },
      },
    ],
  },
  {
    key: 'outbound',
    title: '出库',
    path: '/warehouse/outbound',
    section: 'warehouse',
    codePrefix: 'CK',
    defaultStatus: BOX_STATUS.AUTO,
    description: '导入已完结出运明细，保存并免批；自动扣减库存数量。',
    columns: [
      { title: '出库单号', dataIndex: 'code' },
      { title: '关联发票号', dataIndex: 'shipmentCode' },
      { title: '产品', dataIndex: 'productName' },
      { title: '数量', dataIndex: 'quantity' },
      { title: '仓库', dataIndex: 'warehouseName' },
      { title: '货位', dataIndex: 'location' },
    ],
    formFields: [
      {
        name: 'shipmentCode',
        label: '关联发票号',
        type: 'input',
        required: true,
      },
      { name: 'productName', label: '产品', type: 'input', required: true },
      { name: 'quantity', label: '数量', type: 'number', required: true },
      { name: 'warehouseName', label: '仓库', type: 'input', required: true },
      { name: 'location', label: '货位', type: 'input', required: true },
      { name: 'remark', label: '备注', type: 'textarea' },
    ],
  },
  {
    key: 'settlements',
    title: '结汇',
    path: '/finance/settlements',
    section: 'finance',
    codePrefix: 'JH',
    defaultStatus: BOX_STATUS.AUTO,
    description: '从出运导入；根据付款周期自动计算预计收汇日期。',
    columns: [
      { title: '结汇单号', dataIndex: 'code' },
      { title: '发票号', dataIndex: 'invoiceNo' },
      { title: '发货日期', dataIndex: 'shipDate' },
      { title: '付款周期(天)', dataIndex: 'paymentCycleDays' },
      { title: '预计收汇日期', dataIndex: 'receivableDate' },
      { title: '金额(USD)', dataIndex: 'amount' },
    ],
    formFields: [
      { name: 'invoiceNo', label: '发票号', type: 'input', required: true },
      { name: 'shipDate', label: '发货日期', type: 'date', required: true },
      {
        name: 'paymentCycleDays',
        label: '付款周期(天)',
        type: 'number',
        required: true,
      },
      { name: 'amount', label: '金额(USD)', type: 'number', required: true },
      { name: 'remark', label: '备注', type: 'textarea' },
    ],
    beforeSave: (values) => ({
      ...values,
      receivableDate: calcReceivableDate(
        values.shipDate,
        values.paymentCycleDays
      ),
    }),
  },
  {
    key: 'bankReceipts',
    title: '水单→招领→认领确认',
    path: '/finance/bank-receipts',
    section: 'finance',
    codePrefix: 'SD',
    defaultStatus: BOX_STATUS.CLAIM,
    description: '财务登记水单后进入招领箱，业务认领确认后进入确认箱。',
    columns: [
      { title: '水单号', dataIndex: 'code' },
      { title: '款项类型', dataIndex: 'fundType' },
      { title: '关联单号', dataIndex: 'refNo' },
      { title: '收汇金额', dataIndex: 'receivedAmount' },
      { title: '银行扣费', dataIndex: 'bankFee' },
      { title: '登记日期', dataIndex: 'registerDate' },
    ],
    formFields: [
      {
        name: 'fundType',
        label: '款项类型',
        type: 'select',
        required: true,
        options: [
          { label: '预收客户货款', value: '预收客户货款' },
          { label: '客户货款尾款', value: '客户货款尾款' },
        ],
      },
      { name: 'refNo', label: '关联 PI/发票号', type: 'input', required: true },
      {
        name: 'receivedAmount',
        label: '收汇金额',
        type: 'number',
        required: true,
      },
      { name: 'bankFee', label: '银行扣费', type: 'number', required: true },
      { name: 'registerDate', label: '登记日期', type: 'date', required: true },
      { name: 'remark', label: '备注', type: 'textarea' },
    ],
    rowActions: [
      {
        key: 'confirm',
        label: '认领确认',
        type: 'primary',
        onRun: (record, helpers, moduleItem) => {
          helpers.moveStatus(moduleItem, record.id, BOX_STATUS.CONFIRMED)
          helpers.notify.success('已转入确认箱')
        },
      },
    ],
  },
]

export const menuSections = [
  {
    key: 'overview',
    title: '总览',
    items: [{ key: '/dashboard', label: '业务看板', moduleKey: 'dashboard' }],
  },
  {
    key: 'master',
    title: '基础资料',
    items: moduleDefinitions
      .filter((moduleItem) => moduleItem.section === 'master')
      .map((moduleItem) => ({
        key: moduleItem.path,
        label: moduleItem.title,
        moduleKey: moduleItem.key,
      })),
  },
  {
    key: 'sales',
    title: '销售链路',
    items: moduleDefinitions
      .filter((moduleItem) => moduleItem.section === 'sales')
      .map((moduleItem) => ({
        key: moduleItem.path,
        label: moduleItem.title,
        moduleKey: moduleItem.key,
      })),
  },
  {
    key: 'purchase',
    title: '采购/仓储',
    items: moduleDefinitions
      .filter(
        (moduleItem) =>
          moduleItem.section === 'purchase' ||
          moduleItem.section === 'warehouse'
      )
      .map((moduleItem) => ({
        key: moduleItem.path,
        label: moduleItem.title,
        moduleKey: moduleItem.key,
      })),
  },
  {
    key: 'finance',
    title: '财务环节',
    items: moduleDefinitions
      .filter((moduleItem) => moduleItem.section === 'finance')
      .map((moduleItem) => ({
        key: moduleItem.path,
        label: moduleItem.title,
        moduleKey: moduleItem.key,
      })),
  },
  {
    key: 'documents',
    title: '单据模板',
    items: [
      {
        key: '/docs/print-center',
        label: '打印模板中心',
        moduleKey: 'print-center',
      },
    ],
  },
  {
    key: 'system',
    title: '系统管理',
    items: [
      {
        key: '/system/permissions',
        label: '权限管理',
        moduleKey: 'permission-center',
      },
    ],
  },
]

export const moduleMap = moduleDefinitions.reduce((acc, current) => {
  acc[current.key] = current
  return acc
}, {})
