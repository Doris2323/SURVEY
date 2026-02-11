// ========== 常數定義 ==========

const ANALYZE_ERROR = {
  TRIP_ID_REQUIRED: '旅遊計畫ID必須提供'
};

// ========== 輔助函數 ==========

/**
 * 建立單一花費組合
 * @param {Object} accommodation - 住宿資料
 * @param {Object} transportation - 交通資料
 * @param {number} participants - 參與人數
 * @param {number|null} budgetLimit - 預算上限
 * @returns {Object} 花費組合
 */
function _createCostCombination(accommodation, transportation, participants, budgetLimit) {
  const transportationTotal = transportation.cost * participants;
  const totalCost = accommodation.totalPrice + transportationTotal;
  const costPerPerson = totalCost / participants;
  const overBudget = budgetLimit ? totalCost > budgetLimit : false;

  return {
    accommodationName: accommodation.name,
    accommodationPrice: accommodation.totalPrice,
    transportationType: transportation.type,
    transportationCost: transportation.cost,
    totalCost,
    costPerPerson,
    overBudget
  };
}

/**
 * 產生所有花費組合（笛卡爾積）
 * @param {Array} accommodations - 住宿列表
 * @param {Array} transportations - 交通列表
 * @param {number} participants - 參與人數
 * @param {number|null} budgetLimit - 預算上限
 * @returns {Array} 花費組合列表
 */
function _generateCostCombinations(accommodations, transportations, participants, budgetLimit) {
  const combinations = [];

  for (const acc of accommodations) {
    for (const trans of transportations) {
      combinations.push(_createCostCombination(acc, trans, participants, budgetLimit));
    }
  }

  return combinations;
}

// ========== 公開函數 ==========

/**
 * 花費方案分析
 * @param {number} [tripPlanId] - 旅遊計畫 ID
 * @returns {{ success: boolean, message?: string, data?: Array<Object> }}
 */
function analyzeCosts(tripPlanId) {
  // 驗證：旅遊計畫 ID 必須提供
  if (tripPlanId === undefined || tripPlanId === null) {
    return { success: false, message: ANALYZE_ERROR.TRIP_ID_REQUIRED };
  }

  // 取得旅遊計畫資訊
  const plans = getTripPlans();
  const plan = plans[tripPlanId - 1]; // 使用 1-based index
  if (!plan) {
    return { success: true, data: [] };
  }

  const participants = plan.participants || 1;
  const budgetLimit = plan.budgetLimit;

  // 取得該計畫的住宿和交通
  const accommodations = getAccommodations(tripPlanId);
  const transportations = getTransportations(tripPlanId);

  // 如果缺少住宿或交通，回傳空列表
  if (accommodations.length === 0 || transportations.length === 0) {
    return { success: true, data: [] };
  }

  // 產生笛卡爾積組合並排序
  const combinations = _generateCostCombinations(accommodations, transportations, participants, budgetLimit);
  combinations.sort((a, b) => a.totalCost - b.totalCost);

  return { success: true, data: combinations };
}
