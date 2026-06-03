import { lazy } from 'react';

export const Dashboard = lazy(() =>
  import('../components/Dashboard').then((m) => ({ default: m.Dashboard }))
);
export const Registration = lazy(() =>
  import('../components/Registration').then((m) => ({ default: m.Registration }))
);
export const Inspection = lazy(() =>
  import('../components/Inspection').then((m) => ({ default: m.Inspection }))
);
export const ServiceOrders = lazy(() =>
  import('../components/ServiceOrders').then((m) => ({ default: m.ServiceOrders }))
);
export const SpareParts = lazy(() =>
  import('../components/SpareParts').then((m) => ({ default: m.SpareParts }))
);
export const SparePartsRequest = lazy(() =>
  import('../components/SparePartsRequest').then((m) => ({ default: m.SparePartsRequest }))
);
export const BuyingSparePartIntegrated = lazy(() =>
  import('../components/BuyingSpareParts').then((m) => ({ default: m.BuyingSparePartIntegrated }))
);
export const DirectSalesSparePart = lazy(() =>
  import('../components/DirectSaleSpareParts').then((m) => ({ default: m.DirectSalesSparePart }))
);
export const TransferStock = lazy(() =>
  import('../components/TransferStock').then((m) => ({ default: m.TransferStock }))
);
export const Workshop = lazy(() =>
  import('../components/Workshop').then((m) => ({ default: m.Workshop }))
);
export const Payment = lazy(() =>
  import('../components/Payment').then((m) => ({ default: m.Payment }))
);
export const PaymentList = lazy(() =>
  import('../components/PaymentList').then((m) => ({ default: m.PaymentList }))
);
export const Handover = lazy(() =>
  import('../components/Handover').then((m) => ({ default: m.Handover }))
);
export const FollowUp = lazy(() =>
  import('../components/FollowUp').then((m) => ({ default: m.FollowUp }))
);
export const Report = lazy(() =>
  import('../components/Report').then((m) => ({ default: m.Report }))
);
export const ProcessFlow = lazy(() =>
  import('../components/Processflow').then((m) => ({ default: m.ProcessFlow }))
);
export const BusinessProcessFlowDiagram = lazy(() =>
  import('../components/Businessprocessflowdiagram')
);
