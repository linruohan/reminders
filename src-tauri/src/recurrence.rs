use chrono::{Duration, Months, NaiveDate};

/// 根据重复规则计算下一次截止日期；若超出 recurrence_end_date 则返回 None
pub fn next_due_date(
    current: NaiveDate,
    frequency: &str,
    interval: Option<i32>,
    custom_unit: Option<&str>,
    recurrence_end: Option<NaiveDate>,
) -> Option<NaiveDate> {
    let n = interval.unwrap_or(1).max(1) as u32;
    let next = match frequency {
        "daily" => current + Duration::days(n as i64),
        "weekly" => current + Duration::weeks(n as i64),
        "biweekly" => current + Duration::weeks(2),
        "monthly" => current.checked_add_months(Months::new(n))?,
        "yearly" => current.checked_add_months(Months::new(n * 12))?,
        // 截止日期为 NaiveDate，自定义仅支持天及以上；旧数据中的 minutes/hours 按天处理
        "custom" => match custom_unit.unwrap_or("days") {
            "days" | "minutes" | "hours" => current + Duration::days(n as i64),
            "weeks" => current + Duration::weeks(n as i64),
            "months" => current.checked_add_months(Months::new(n))?,
            "years" => current.checked_add_months(Months::new(n * 12))?,
            _ => current + Duration::days(n as i64),
        },
        _ => return None,
    };

    if let Some(end) = recurrence_end {
        if next > end {
            return None;
        }
    }
    Some(next)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn daily_and_end() {
        let d = NaiveDate::from_ymd_opt(2026, 7, 23).unwrap();
        let end = NaiveDate::from_ymd_opt(2026, 7, 24).unwrap();
        assert_eq!(
            next_due_date(d, "daily", Some(1), None, Some(end)),
            Some(NaiveDate::from_ymd_opt(2026, 7, 24).unwrap())
        );
        assert_eq!(next_due_date(d, "daily", Some(1), None, Some(d)), None);
    }
}
