from typing import Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class ProfitResult:
    """利润计算结果"""
    price_rub: float
    price_cny: float
    cost_total: float
    commission: float
    return_fee: float
    other_costs: float
    profit: float
    profit_rate: float
    meets_criteria: bool


class ProfitCalculator:
    """利润计算器"""
    
    def __init__(self):
        self.default_params = {
            "exchange_rate": 12.0,
            "commission_rate": 12.0,
            "min_profit_rate": 1.0,
            "return_rate": 0.03,
            "other_costs": 0.0
        }
        
    def calculate(
        self,
        price_rub: float,
        cost: float,
        weight: float,
        params: Dict[str, Any]
    ) -> ProfitResult:
        """
        计算利润
        
        Args:
            price_rub: 商品价格（卢布）
            cost: 采购成本（人民币）
            weight: 重量（克）
            params: 参数字典
        """
        exchange_rate = params.get("exchange_rate", self.default_params["exchange_rate"])
        commission_rate = params.get("commission_rate", self.default_params["commission_rate"])
        min_profit_rate = params.get("min_profit_rate", self.default_params["min_profit_rate"])
        return_rate = params.get("return_rate", self.default_params["return_rate"])
        other_costs = params.get("other_costs", self.default_params["other_costs"])
        
        # 卢布转人民币
        price_cny = price_rub / exchange_rate
        
        # 计算各项费用
        commission = price_cny * (commission_rate / 100)
        return_fee = price_cny * return_rate
        
        # 总成本
        cost_total = cost + other_costs
        
        # 计算利润
        profit = price_cny - cost_total - commission - return_fee
        profit_rate = (profit / price_cny) * 100 if price_cny > 0 else 0
        
        # 检查是否符合条件
        meets_criteria = profit_rate >= min_profit_rate
        
        return ProfitResult(
            price_rub=price_rub,
            price_cny=round(price_cny, 2),
            cost_total=round(cost_total, 2),
            commission=round(commission, 2),
            return_fee=round(return_fee, 2),
            other_costs=round(other_costs, 2),
            profit=round(profit, 2),
            profit_rate=round(profit_rate, 2),
            meets_criteria=meets_criteria
        )
        
    def check_product_criteria(
        self,
        product: Dict[str, Any],
        params: Dict[str, Any]
    ) -> bool:
        """
        检查商品是否符合选品条件
        """
        sales_month = product.get("sales_month", 0)
        competitors = product.get("competitors", 0)
        listing_days = product.get("listing_days", 0)
        price = product.get("price", 0)
        rating = product.get("rating", 0)
        
        # 销量范围
        if not (params.get("sales_month_min", 0) <= sales_month <= params.get("sales_month_max", 9999999)):
            return False
            
        # 跟卖人数范围
        if not (params.get("competitors_min", 0) <= competitors <= params.get("competitors_max", 999999)):
            return False
            
        # 上架时间范围
        if not (params.get("listing_days_min", 0) <= listing_days <= params.get("listing_days_max", 99999)):
            return False
            
        # 价格范围
        if not (params.get("price_min", 0) <= price <= params.get("price_max", 999999)):
            return False
            
        # 评分范围
        if not (params.get("rating_min", 0) <= rating <= params.get("rating_max", 5)):
            return False
            
        return True
