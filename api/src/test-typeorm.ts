import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class TestService {
  constructor(private dataSource: DataSource) {}

  async runTest() {
    // Injeta um user pra testar
    const [{ id }] = await this.dataSource.query(`INSERT INTO users (credit_limit) VALUES (200) RETURNING id`);
    const updateResult = await this.dataSource.query(`UPDATE users SET used_limit = used_limit + 50 WHERE id = $1 AND (credit_limit - used_limit) >= 50 RETURNING id`, [id]);
    console.log("UPDATE_RESULT_50:", JSON.stringify(updateResult));
    
    // Tenta atualizar 200 (nao deve passar pq so tem 150)
    const updateResultFail = await this.dataSource.query(`UPDATE users SET used_limit = used_limit + 200 WHERE id = $1 AND (credit_limit - used_limit) >= 200 RETURNING id`, [id]);
    console.log("UPDATE_RESULT_FAIL:", JSON.stringify(updateResultFail));
  }
}
